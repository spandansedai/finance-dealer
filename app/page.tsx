/**
 * @file app/page.tsx
 * @description Central Hub / Dashboard for the Finance-Dealer application.
 * Aggregates and visualizes key financial metrics including income, expenses, 
 * savings rate, and NEPSE portfolio performance. Supports both authenticated 
 * Supabase sessions and ephemeral Guest Mode state.
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LedgerRow } from '@/components/LedgerRow';
import { CountUp } from '@/components/CountUp';
import { FinancialInsights } from '@/components/FinancialInsights';
import { PortfolioAllocationChart } from '@/components/PortfolioAllocationChart';
import { CashFlowChart } from '@/components/CashFlowChart';
import { StockHolding, Transaction } from '@/types';
import {
  calculateSavingsSummary,
  calculatePortfolioAnalytics,
  calculateTotalByType,
  formatNepaliCurrency,
  formatNepaliNumber,
} from '@/lib/calculations/finance';
import { NEPAL_TAX_FISCAL_YEAR } from '@/lib/config/nepalTax';
import { generateInsights } from '@/lib/insights';
import { supabase } from '@/lib/supabase';
import { useGuestMode } from '@/context/GuestModeContext';
import {
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardSubtitle,
  CardTitle,
  KpiGrid,
  KpiTile,
  LinkTile,
  Meter,
  Notice,
  PageHeader,
  PageShell,
  Skeleton,
  Stamp,
} from '@/components/ui';

/**
 * Transforms a raw database row into a structured StockHolding object.
 * Maps both snake_case (database) and camelCase (guest/previous versions) keys.
 * 
 * @param row - Raw data object from Supabase or guest state.
 * @returns Standardized StockHolding object.
 */
const rowToHolding = (row: any): StockHolding => ({
  id: row.id,
  symbol: (row.symbol || '').toUpperCase(),
  companyName: row.company_name ?? row.companyName ?? row.symbol,
  shares: Number(row.shares ?? row.units ?? 0),
  averagePurchasePrice: Number(
    row.average_purchase_price ?? row.averagePurchasePrice ?? row.buy_price ?? row.buyPrice ?? 0
  ),
  currentPrice: Number(row.current_price ?? row.currentPrice ?? 0),
  sector: row.sector ?? undefined,
  totalCost: row.total_cost != null ? Number(row.total_cost) : undefined,
});

const NO_TRANSACTIONS: Transaction[] = [];
const NO_HOLDINGS: StockHolding[] = [];

/**
 * The primary Dashboard page component.
 * Manages data fetching for transactions and holdings, identifies user auth status,
 * and passes data to calculation engines for visualization.
 */
export default function HomePage() {
  const { guestTransactions, guestHoldings } = useGuestMode();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbTransactions, setDbTransactions] = useState<Transaction[]>([]);
  const [dbHoldings, setDbHoldings] = useState<StockHolding[]>([]);

  // Orchestrate data loading and auth state listening
  useEffect(() => {
    let isMounted = true;

    /**
     * Loads user-specific data from Supabase if authenticated.
     */
    const loadUserData = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();

      if (!isMounted) return;

      const currentUserId = data.user?.id ?? null;
      setUserId(currentUserId);

      // Fetch from Supabase if we have a valid session
      if (currentUserId) {
        const [txRes, holdingsRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('id, type, amount, category, description, date'),
          supabase
            .from('holdings')
            .select('*'),
        ]);

        if (isMounted) {
          if (txRes.data) {
            setDbTransactions(
              txRes.data.map((row: any) => ({
                id: row.id,
                type: row.type,
                amount: Number(row.amount),
                category: row.category,
                description: row.description,
                date: row.date,
              }))
            );
          }
          if (holdingsRes.data) {
            setDbHoldings(holdingsRes.data.map(rowToHolding));
          }
        }
      } else {
        // Clear DB state if user signs out
        setDbTransactions([]);
        setDbHoldings([]);
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    loadUserData();

    // Listen for sign-in/sign-out events to re-fetch or clear data
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);

      if (currentUserId) {
        const [txRes, holdingsRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('id, type, amount, category, description, date'),
          supabase
            .from('holdings')
            .select('*'),
        ]);

        if (txRes.data) {
          setDbTransactions(
            txRes.data.map((row: any) => ({
              id: row.id,
              type: row.type,
              amount: Number(row.amount),
              category: row.category,
              description: row.description,
              date: row.date,
            }))
          );
        }
        if (holdingsRes.data) {
          setDbHoldings(holdingsRes.data.map(rowToHolding));
        }
      } else {
        setDbTransactions([]);
        setDbHoldings([]);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // When authenticated, use Supabase data. Guest (sample) data is used only once the
  // auth check has finished with no user, so a signed-in user never sees it flash.
  const isGuest = !loading && !userId;
  const activeTransactions = userId ? dbTransactions : isGuest ? guestTransactions : NO_TRANSACTIONS;
  const activeHoldings = userId ? dbHoldings : isGuest ? guestHoldings : NO_HOLDINGS;

  const totalIncome = calculateTotalByType(activeTransactions, 'income');
  const totalExpenses = calculateTotalByType(activeTransactions, 'expense');

  // Pure Math Calculations - Savings Engine
  const savingsSummary = calculateSavingsSummary(totalIncome, totalExpenses);
  const {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    savingsRate,
    annualSavings,
  } = savingsSummary;

  // Pure Math Calculations - Portfolio Engine
  const portfolioSummary = calculatePortfolioAnalytics(activeHoldings);
  const {
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPercentage,
    holdings: analyzedHoldings,
  } = portfolioSummary;

  const isSavingsDeficit = monthlySavings < 0;
  const savingsRateTone = savingsRate >= 20 ? 'gain' : isSavingsDeficit ? 'loss' : 'warn';
  const isPortfolioProfit = totalProfitLoss > 0;
  const isPortfolioLoss = totalProfitLoss < 0;

  // Combined Financial Position
  const totalCombinedAssets = totalCurrentValue + Math.max(0, annualSavings);
  const hasAnyData = activeTransactions.length > 0 || activeHoldings.length > 0;

  // Rule-based factual financial observations
  const insights = useMemo(() => {
    return generateInsights({
      transactions: activeTransactions,
      savingsSummary,
      portfolioSummary,
      holdings: activeHoldings,
    });
  }, [activeTransactions, savingsSummary, portfolioSummary, activeHoldings]);

  return (
    <PageShell>
      {/* Masthead */}
      <PageHeader
        title="Account overview"
        description={
          <>
            Everything on one page: what came in, what went out, what is left to invest, and
            what the NEPSE holdings are worth today.
          </>
        }
        actions={
          <>
            <Stamp label="Shrawan&ndash;Ashar" value={NEPAL_TAX_FISCAL_YEAR.replace('FY ', '')} />
            <ButtonLink variant="primary" size="sm" href="/expenses">
              Write an entry
            </ButtonLink>
          </>
        }
      />

      {/* Guest Mode Indicator Banner */}
      {!userId && !loading && (
        <Notice tone="warn">
          <span>
            You are looking at a <strong>sample book</strong>. Try anything: add, edit or delete
            entries and holdings. It all stays in this tab and resets when you reload.
          </span>
          <ButtonLink variant="warn" size="sm" href="/login">
            Sign in to keep your own
          </ButtonLink>
        </Notice>
      )}

      {/* Headline figures */}
      {loading ? (
        <KpiGrid aria-busy="true" aria-label="Reading the book">
          {[0, 1, 2, 3].map((i) => (
            <KpiTile
              key={i}
              label={<Skeleton className="h-3 w-20" />}
              value={<Skeleton className="h-7 w-32" />}
              footer={<Skeleton className="h-2.5 w-24" />}
            />
          ))}
        </KpiGrid>
      ) : (
        <KpiGrid as="section" aria-label="Headline figures">
          <KpiTile
            label="Combined position"
            value={
              <>
                <span className="unit">Rs</span>
                <CountUp value={totalCombinedAssets} format={(n) => formatNepaliNumber(n, 0)} />
              </>
            }
            footer="Holdings at market plus a year of savings."
          />
          <KpiTile
            tone={isSavingsDeficit ? 'loss' : 'gain'}
            label={isSavingsDeficit ? 'Shortfall' : 'Left to invest'}
            valueClassName={isSavingsDeficit ? 'fig-loss' : 'fig-gain'}
            value={
              <>
                <span className="unit">Rs</span>
                <CountUp
                  value={monthlySavings}
                  format={(n) => `${n < 0 ? '\u2212' : ''}${formatNepaliNumber(Math.abs(n), 0)}`}
                />
              </>
            }
            footer="Income less expenses on the book."
          />
          <KpiTile
            tone={isPortfolioLoss ? 'loss' : 'gain'}
            label="Portfolio value"
            value={
              <>
                <span className="unit">Rs</span>
                <CountUp value={totalCurrentValue} format={(n) => formatNepaliNumber(n, 0)} />
              </>
            }
            footer={
              <span className={isPortfolioLoss ? 'fig-loss' : isPortfolioProfit ? 'fig-gain' : undefined}>
                {totalInvested > 0
                  ? `${totalProfitLossPercentage >= 0 ? '+' : '\u2212'}${Math.abs(totalProfitLossPercentage).toFixed(2)}% on cost`
                  : 'No holdings yet.'}
              </span>
            }
          />
          <KpiTile
            tone={savingsRateTone}
            label="Savings rate"
            value={<CountUp value={savingsRate} format={(n) => `${n.toFixed(1)}%`} />}
            footer="A 20% rate is a common guide."
          >
            <Meter
              percent={savingsRate}
              tone={savingsRateTone}
              label={`Savings rate ${savingsRate.toFixed(1)}% against a 20% guide`}
            />
          </KpiTile>
        </KpiGrid>
      )}

      {/* Double-entry spread: cash flow on the left page, equity on the right. */}
      <Card as="section" className="grid grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div className="border-b border-rule lg:border-b-0 lg:border-r">
          <CardHeader>
            <CardTitle>
              Cash flow
            </CardTitle>
            <CardSubtitle as="span">
              {activeTransactions.length}{' '}
              {activeTransactions.length === 1 ? 'entry' : 'entries'} recorded
            </CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="ledger">
              <LedgerRow
                label="Income"
                amount={monthlyIncome}
                unit="Rs"
                tone="gain"
                note="Salary, side work, freelance and returns."
              />
              <LedgerRow
                label="Expenses"
                amount={monthlyExpenses}
                unit="Rs"
                tone="loss"
                note="Rent, living costs, bills and card spending."
              />
              <LedgerRow
                label={isSavingsDeficit ? 'Shortfall' : 'Left to invest'}
                amount={monthlySavings}
                unit="Rs"
                tone={isSavingsDeficit ? 'loss' : 'gain'}
                total
                large
              />
              <LedgerRow
                label="Savings rate"
                value={`${savingsRate.toFixed(2)}%`}
                tone={isSavingsDeficit ? 'loss' : savingsRate >= 20 ? 'gain' : 'mute'}
                note={
                  monthlyIncome <= 0
                    ? 'No income recorded yet.'
                    : `You are keeping ${savingsRate.toFixed(2)}% of what you earn.`
                }
              />
            </div>
          </CardBody>
        </div>

        <div>
          <CardHeader>
            <CardTitle>
              Equity
            </CardTitle>
            <CardSubtitle as="span">
              {activeHoldings.length} {activeHoldings.length === 1 ? 'scrip' : 'scrips'} held
            </CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="ledger">
              <LedgerRow
                label="Invested"
                amount={totalInvested}
                unit="Rs"
                tone="mute"
                note="What the shares cost you."
              />
              <LedgerRow
                label="Market value"
                amount={totalCurrentValue}
                unit="Rs"
                note="What they are worth at the latest price."
              />
              <LedgerRow
                label={isPortfolioLoss ? 'Unrealised loss' : 'Unrealised gain'}
                amount={totalProfitLoss}
                unit="Rs"
                signed
                tone={isPortfolioLoss ? 'loss' : isPortfolioProfit ? 'gain' : 'mute'}
                total
                large
              />
              <LedgerRow
                label="Return"
                value={
                  totalInvested > 0
                    ? `${totalProfitLossPercentage >= 0 ? '+' : '\u2212'}${Math.abs(
                        totalProfitLossPercentage
                      ).toFixed(2)}%`
                    : '0.00%'
                }
                tone={isPortfolioLoss ? 'loss' : isPortfolioProfit ? 'gain' : 'mute'}
                note={
                  totalInvested > 0
                    ? 'Against your total cost basis.'
                    : 'Add a holding to see a return.'
                }
              />
            </div>
          </CardBody>
        </div>

        {/* Carried forward — the line that joins the two pages. */}
        <CardFooter className="lg:col-span-2">
          <p className="text-body leading-relaxed text-ink-soft">
            {monthlySavings > 0 ? (
              <>
                Carried forward:{' '}
                <span className="fig fig-sm fig-gain">
                  {formatNepaliCurrency(monthlySavings)}
                </span>{' '}
                a month, or{' '}
                <span className="fig fig-sm">{formatNepaliCurrency(annualSavings)}</span> over a
                year, available to put into NEPSE. Combined position today:{' '}
                <span className="fig fig-sm">{formatNepaliCurrency(totalCombinedAssets)}</span>.
              </>
            ) : hasAnyData ? (
              <>
                Nothing carried forward this month &mdash; expenses are running at or above
                income.
              </>
            ) : (
              <>Nothing written in the book yet.</>
            )}
          </p>
        </CardFooter>
      </Card>

      {/* Financial Observations & Insights Engine Section */}
      <FinancialInsights insights={insights} hasAnyData={hasAnyData} />

      {/* Charts. Two different jobs, so two different frames. */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle as="h3">Where the month went</CardTitle>
              <CardSubtitle>In against out, and what survived.</CardSubtitle>
            </div>
            <ButtonLink variant="link" href="/expenses">
              Write an entry
            </ButtonLink>
          </CardHeader>
          <CardBody>
            <CashFlowChart
              income={monthlyIncome}
              expenses={monthlyExpenses}
              savings={monthlySavings}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle as="h3">Weight by scrip</CardTitle>
              <CardSubtitle>How the holdings divide up at today&rsquo;s prices.</CardSubtitle>
            </div>
            <ButtonLink variant="link" href="/portfolio">
              Floor sheet
            </ButtonLink>
          </CardHeader>
          <CardBody>
            <PortfolioAllocationChart
              holdings={analyzedHoldings}
              totalCurrentValue={totalCurrentValue}
            />
          </CardBody>
        </Card>
      </section>

      {/* Other pages of the book */}
      <nav className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Other pages of the book">
        <LinkTile href="/expenses" icon="Rs" title="Income & expenses">
          Write entries, reconcile account balances against a statement, and record Dollar Card
          spending at the NRB rate.
        </LinkTile>
        <LinkTile href="/portfolio" icon="LTP" title="NEPSE floor sheet">
          Scrip holdings with live prices, cost basis, profit and loss, and weight across the
          portfolio.
        </LinkTile>
        <LinkTile href="/salary" icon="%" title="Salary & tax">
          Plan monthly pay and savings targets, and estimate income tax against the current Nepal
          schedule.
        </LinkTile>
      </nav>

    </PageShell>
  );
}
