'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LedgerRow } from '@/components/LedgerRow';
import { StockHolding } from '@/types';
import {
  calculatePortfolioAnalytics,
  formatNepaliCurrency,
  formatNepaliNumber,
} from '@/lib/calculations/finance';
import { supabase } from '@/lib/supabase';
import { useGuestMode } from '@/context/GuestModeContext';
import { NepsePricesApiResponse } from '@/lib/market-data';

/**
 * NEPSE stock portfolio page. Authenticated users' holdings are read from and
 * written to the Supabase `holdings` table (RLS-scoped to their own user_id);
 * logged-out visitors use the in-memory guest context instead (see
 * GuestModeContext), same pattern as the expenses page.
 *
 * Live NEPSE market prices are periodically fetched server-side via /api/nepse-prices
 * and overlaid on client views for calculations without mutating the user's database.
 */

// Converts a raw Supabase `holdings` row (snake_case columns, possibly using
// legacy units/buy_price naming) into the app's StockHolding shape.
// See app/page.tsx's rowToHolding for the same mapping used on the dashboard.
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
});

export default function PortfolioPage() {
  const {
    guestHoldings,
    addGuestHolding,
    updateGuestHoldingPrice,
    deleteGuestHolding,
    clearGuestHoldings,
  } = useGuestMode();

  const [dbHoldings, setDbHoldings] = useState<StockHolding[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auth + data loading state
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingHoldings, setLoadingHoldings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Live price tracking state
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<Date | null>(null);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'loading' | 'live' | 'fallback'>('idle');
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [timeAgoText, setTimeAgoText] = useState<string>('');

  // Form State
  const [symbol, setSymbol] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [averagePurchasePrice, setAveragePurchasePrice] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inline Current Price Editing State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPriceInput, setTempPriceInput] = useState<string>('');

  const loadHoldings = async () => {
    setLoadingHoldings(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('holdings')
      .select('*');

    if (error) {
      setLoadError('Could not load your stock holdings. Please try refreshing the page.');
      setLoadingHoldings(false);
      return;
    }

    setDbHoldings((data ?? []).map(rowToHolding));
    setLoadingHoldings(false);
  };

  // Check auth session, then load this user's holdings from Supabase.
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;

      const currentUserId = data.user?.id ?? null;
      setUserId(currentUserId);
      setAuthChecked(true);

      if (currentUserId) {
        await loadHoldings();
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);
      if (currentUserId) {
        await loadHoldings();
      } else {
        setDbHoldings([]);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return '';
    const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSeconds < 60) return 'just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  // Internal live price polling helper
  const fetchLivePrices = async (isManual = false) => {
    if (isManual) setIsRefreshingPrices(true);
    try {
      const res = await fetch('/api/nepse-prices');
      if (!res.ok) {
        setLiveStatus((prev) => (prev === 'live' ? 'live' : 'fallback'));
        return;
      }
      const data: NepsePricesApiResponse = await res.json();
      if (data && data.prices && Object.keys(data.prices).length > 0) {
        setLivePrices(data.prices);
        const updateDate = data.updatedAt ? new Date(data.updatedAt) : new Date();
        setLiveUpdatedAt(updateDate);
        setTimeAgoText(formatTimeAgo(updateDate));
        setLiveStatus('live');
      } else {
        setLiveStatus((prev) => (prev === 'live' ? 'live' : 'fallback'));
      }
    } catch {
      setLiveStatus((prev) => (prev === 'live' ? 'live' : 'fallback'));
    } finally {
      if (isManual) setIsRefreshingPrices(false);
    }
  };

  // Poll internal live price API every 3 minutes, update time ago label every 30s
  useEffect(() => {
    fetchLivePrices();

    const pollInterval = setInterval(() => {
      fetchLivePrices();
    }, 3 * 60 * 1000); // 3 minutes

    const timeAgoInterval = setInterval(() => {
      setLiveUpdatedAt((curr) => {
        if (curr) {
          setTimeAgoText(formatTimeAgo(curr));
        }
        return curr;
      });
    }, 30 * 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timeAgoInterval);
    };
  }, []);

  // Active holdings set (Supabase if authenticated, in-memory if guest)
  const activeHoldings = userId ? dbHoldings : guestHoldings;

  // Overlay live prices on top of stored holdings for calculation and display
  const effectiveHoldings = useMemo(() => {
    return activeHoldings.map((holding) => {
      const sym = (holding.symbol || '').toUpperCase().trim();
      const livePrice = livePrices[sym];
      const hasLivePrice = typeof livePrice === 'number' && livePrice > 0;

      return {
        ...holding,
        currentPrice: hasLivePrice ? livePrice : holding.currentPrice,
        isLivePrice: hasLivePrice,
        savedPrice: holding.currentPrice,
      };
    });
  }, [activeHoldings, livePrices]);

  // Run pure calculations with effective holdings
  const portfolioSummary = calculatePortfolioAnalytics(effectiveHoldings);
  const {
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPercentage,
    holdings: analyzedHoldings,
  } = portfolioSummary;

  const isOverallProfit = totalProfitLoss > 0;
  const isOverallLoss = totalProfitLoss < 0;

  // Add new holding handler
  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) {
      setFormError('Please enter a valid stock symbol (e.g. NABIL).');
      return;
    }

    const parsedShares = parseFloat(shares);
    if (!parsedShares || isNaN(parsedShares) || parsedShares <= 0) {
      setFormError('Please enter a valid number of shares greater than 0.');
      return;
    }

    const parsedAvgPrice = parseFloat(averagePurchasePrice);
    if (isNaN(parsedAvgPrice) || parsedAvgPrice < 0) {
      setFormError('Please enter a valid average purchase price (Rs. >= 0).');
      return;
    }

    const parsedCurrentPrice = parseFloat(currentPrice);
    if (isNaN(parsedCurrentPrice) || parsedCurrentPrice < 0) {
      setFormError('Please enter a valid current price (Rs. >= 0).');
      return;
    }

    const finalCompanyName = companyName.trim() || `${cleanSymbol} Security`;

    if (userId) {
      setSubmitting(true);

      const { data, error } = await supabase
        .from('holdings')
        .insert({
          user_id: userId,
          symbol: cleanSymbol,
          company_name: finalCompanyName,
          shares: parsedShares,
          average_purchase_price: parsedAvgPrice,
          current_price: parsedCurrentPrice,
        })
        .select()
        .single();

      setSubmitting(false);

      if (error || !data) {
        setFormError('Could not save the holding. Please try again.');
        return;
      }

      setDbHoldings((prev) => [rowToHolding(data), ...prev]);
    } else {
      // Guest mode
      addGuestHolding({
        symbol: cleanSymbol,
        companyName: finalCompanyName,
        shares: parsedShares,
        averagePurchasePrice: parsedAvgPrice,
        currentPrice: parsedCurrentPrice,
      });
    }

    // Reset Form
    setSymbol('');
    setCompanyName('');
    setShares('');
    setAveragePurchasePrice('');
    setCurrentPrice('');
    setFormError(null);
  };

  // Delete Holding
  const handleDeleteHolding = async (id?: string) => {
    if (!id) return;

    if (userId) {
      const { error } = await supabase.from('holdings').delete().eq('id', id);

      if (error) {
        setLoadError('Could not delete that holding. Please try again.');
        return;
      }

      setDbHoldings((prev) => prev.filter((h) => h.id !== id));
    } else {
      deleteGuestHolding(id);
    }
  };

  // Start inline price edit (editing the stored fallback price)
  const handleStartPriceEdit = (id: string, currentVal: number) => {
    setEditingPriceId(id);
    setTempPriceInput(currentVal.toString());
  };

  // Save inline price edit
  const handleSavePriceEdit = async (id: string) => {
    const parsed = parseFloat(tempPriceInput);
    if (!isNaN(parsed) && parsed >= 0) {
      if (userId) {
        const { error } = await supabase
          .from('holdings')
          .update({ current_price: parsed })
          .eq('id', id);

        if (error) {
          setLoadError('Could not update stock price. Please try again.');
          return;
        }

        setDbHoldings((prev) =>
          prev.map((h) => (h.id === id ? { ...h, currentPrice: parsed } : h))
        );
      } else {
        updateGuestHoldingPrice(id, parsed);
      }
    }
    setEditingPriceId(null);
    setTempPriceInput('');
  };

  // Cancel inline price edit
  const handleCancelPriceEdit = () => {
    setEditingPriceId(null);
    setTempPriceInput('');
  };

  const handleClearAll = async () => {
    if (userId) {
      const { error } = await supabase.from('holdings').delete().eq('user_id', userId);

      if (error) {
        setLoadError('Could not clear your holdings. Please try again.');
        return;
      }

      setDbHoldings([]);
    } else {
      clearGuestHoldings();
    }
  };

  // Filtered Holdings
  const filteredHoldings = analyzedHoldings.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.symbol.toLowerCase().includes(q) ||
      item.companyName.toLowerCase().includes(q)
    );
  });

  return (
    <main className="page bound">
      <span className="binding-label">NEPSE</span>
      <div className="space-y-5">
        {/* Masthead */}
        <header className="masthead">
          <div>
            <h1>Floor sheet</h1>
            <p className="masthead-note">
              Every scrip you hold, what it cost, what it is worth now, and how much of the
              portfolio it accounts for.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {liveStatus === 'live' ? (
              <span className="tag tag-gain">
                <span
                  className="pulse-live inline-block h-1.5 w-1.5 shrink-0 bg-[currentColor]"
                  aria-hidden="true"
                />
                Live, {timeAgoText || 'just now'}
              </span>
            ) : (
              <span className="tag">Saved prices</span>
            )}
            <button
              type="button"
              onClick={() => fetchLivePrices(true)}
              disabled={isRefreshingPrices}
              className="btn btn-sm"
            >
              {isRefreshingPrices ? 'Refreshing…' : 'Refresh prices'}
            </button>
          </div>
        </header>

        {loadError && <div className="note note-loss">{loadError}</div>}
        {loadingHoldings && <p className="fig fig-sm fig-mute">Reading the book&hellip;</p>}

        {!userId && authChecked && (
          <div className="note note-warn">
            <span>
              This is a <strong>scratch page</strong>. Holdings stay in memory and are gone when
              you reload.
            </span>
            <Link href="/login" className="btn btn-warn btn-sm">
              Sign in to keep them
            </Link>
          </div>
        )}

        {/* Position totals */}
        <section className="sheet">
          <div className="sheet-hd">
            <h2 className="sheet-title">
              Position
            </h2>
            <span className="sheet-sub">
              {activeHoldings.length} {activeHoldings.length === 1 ? 'scrip' : 'scrips'} held,
              valued in NPR
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="sheet-bd border-b border-rule lg:border-b-0 lg:border-r">
              <div className="ledger">
                <LedgerRow label="Cost basis" amount={totalInvested} unit="Rs" tone="mute" />
                <LedgerRow label="Market value" amount={totalCurrentValue} unit="Rs" large />
              </div>
            </div>
            <div className="sheet-bd">
              <div className="ledger">
                <LedgerRow
                  label={isOverallLoss ? 'Unrealised loss' : 'Unrealised gain'}
                  amount={totalProfitLoss}
                  unit="Rs"
                  signed
                  tone={isOverallLoss ? 'loss' : isOverallProfit ? 'gain' : 'mute'}
                  large
                />
                <LedgerRow
                  label="Return on cost"
                  value={
                    totalInvested > 0
                      ? `${totalProfitLossPercentage >= 0 ? '+' : '−'}${Math.abs(
                          totalProfitLossPercentage
                        ).toFixed(2)}%`
                      : '0.00%'
                  }
                  tone={isOverallLoss ? 'loss' : isOverallProfit ? 'gain' : 'mute'}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          {/* Add a holding */}
          <div className="sheet lg:col-span-4">
            <div className="sheet-hd">
              <h2 className="sheet-title">Add a holding</h2>
              {!userId && <span className="tag tag-warn">Scratch</span>}
            </div>
            <div className="sheet-bd">
              {formError && (
                <div className="note note-loss mb-3">{formError}</div>
              )}

              <form onSubmit={handleAddHolding} className="space-y-3">
                <div>
                  <label htmlFor="symbol" className="field-lbl">
                    Scrip
                  </label>
                  <input
                    id="symbol"
                    type="text"
                    placeholder="NABIL"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    required
                    className="field font-mono uppercase tracking-[0.08em]"
                  />
                  <p className="field-hint">The NEPSE ticker, e.g. NABIL, GBIME, HDL.</p>
                </div>

                <div>
                  <label htmlFor="companyName" className="field-lbl">
                    Company name
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="Nabil Bank Limited"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="field"
                  />
                </div>

                <div>
                  <label htmlFor="shares" className="field-lbl">
                    Shares
                  </label>
                  <input
                    id="shares"
                    type="number"
                    step="any"
                    min="0.001"
                    placeholder="100"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    required
                    className="field field-num"
                  />
                </div>

                <div>
                  <label htmlFor="avgPrice" className="field-lbl">
                    Average buy price
                  </label>
                  <div className="field-wrap">
                    <span className="prefix">Rs</span>
                    <input
                      id="avgPrice"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="500"
                      value={averagePurchasePrice}
                      onChange={(e) => setAveragePurchasePrice(e.target.value)}
                      required
                      className="field field-num"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="currPrice" className="field-lbl">
                    Fallback price
                  </label>
                  <div className="field-wrap">
                    <span className="prefix">Rs</span>
                    <input
                      id="currPrice"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="600"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      required
                      className="field field-num"
                    />
                  </div>
                  <p className="field-hint">Used when the live NEPSE feed is unavailable.</p>
                </div>

                <button type="submit" disabled={submitting} className="btn btn-ink btn-block">
                  {submitting ? 'Saving…' : 'Add holding'}
                </button>
              </form>
            </div>
          </div>

          {/* Floor sheet */}
          <div className="sheet lg:col-span-8">
            <div className="sheet-hd">
              <div>
                <h2 className="sheet-title">Holdings</h2>
                <p className="sheet-sub">
                  Showing {filteredHoldings.length} of {activeHoldings.length}
                </p>
              </div>
              <input
                type="text"
                placeholder="Filter by scrip or company"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field w-full sm:w-56"
                aria-label="Filter holdings"
              />
            </div>

            {filteredHoldings.length === 0 ? (
              <div className="sheet-bd">
                <div className="empty">
                  <p className="empty-mark">[ NO ENTRIES ]</p>
                  <p className="empty-title">Nothing on the sheet</p>
                  <p className="empty-body">
                    {activeHoldings.length === 0
                      ? 'Add a scrip on the left to start tracking your NEPSE portfolio.'
                      : 'No holding matches that filter.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="scroll-x">
                <table className="floor min-w-[46rem]">
                  <thead>
                    <tr>
                      <th scope="col">Scrip</th>
                      <th scope="col" className="text-right">
                        Qty
                      </th>
                      <th scope="col" className="text-right">
                        Buy
                      </th>
                      <th scope="col" className="text-right">
                        LTP
                      </th>
                      <th scope="col" className="text-right">
                        Cost
                      </th>
                      <th scope="col" className="text-right">
                        Value
                      </th>
                      <th scope="col" className="text-right">
                        P/L
                      </th>
                      <th scope="col" className="text-right">
                        Weight
                      </th>
                      <th scope="col" className="text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHoldings.map((item) => {
                      const isProfit = item.profitLoss > 0;
                      const isLoss = item.profitLoss < 0;
                      const isEditingThis = editingPriceId === item.id;
                      const plClass = isProfit ? 'fig-gain' : isLoss ? 'fig-loss' : 'fig-mute';

                      return (
                        <tr key={item.id}>
                          <td>
                            <span className="ticker">{item.symbol}</span>
                            <span className="mt-1 block max-w-[10rem] truncate text-[11px] text-ink-faint">
                              {item.companyName}
                            </span>
                          </td>

                          <td className="num">{formatNepaliNumber(item.shares, 0)}</td>

                          <td className="num fig-mute">
                            {formatNepaliNumber(item.averagePurchasePrice)}
                          </td>

                          <td className="num">
                            {isEditingThis ? (
                              <span className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={tempPriceInput}
                                  onChange={(e) => setTempPriceInput(e.target.value)}
                                  className="field field-num w-24 !py-0.5"
                                  autoFocus
                                  aria-label={`Saved price for ${item.symbol}`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePriceEdit(item.id);
                                    if (e.key === 'Escape') handleCancelPriceEdit();
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePriceEdit(item.id)}
                                  className="btn btn-ink btn-sm"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelPriceEdit}
                                  className="btn btn-sm"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartPriceEdit(item.id, item.savedPrice ?? item.currentPrice)
                                }
                                className="inline-flex items-center gap-1.5 font-mono tabular-nums hover:text-khata"
                                title={
                                  item.isLivePrice
                                    ? `Live ${item.currentPrice}. Saved fallback ${
                                        item.savedPrice ?? item.currentPrice
                                      }. Click to edit the fallback.`
                                    : 'Click to edit the saved price'
                                }
                              >
                                {formatNepaliNumber(item.currentPrice)}
                                {item.isLivePrice && (
                                  <span
                                    className="pulse-live inline-block h-1.5 w-1.5 shrink-0 bg-gain"
                                    aria-label="live price"
                                  />
                                )}
                              </button>
                            )}
                          </td>

                          <td className="num fig-mute">
                            {formatNepaliNumber(item.investedAmount)}
                          </td>

                          <td className="num font-medium">
                            {formatNepaliNumber(item.currentValue)}
                          </td>

                          <td className={`num ${plClass}`}>
                            {isProfit ? '+' : isLoss ? '−' : ''}
                            {formatNepaliNumber(Math.abs(item.profitLoss))}
                            <span className="mt-0.5 block text-[11px]">
                              {item.profitLossPercentage > 0 ? '+' : ''}
                              {item.profitLossPercentage.toFixed(2)}%
                            </span>
                          </td>

                          <td className="num">
                            {item.portfolioWeightPercentage.toFixed(1)}%
                            <span className="weightbar" aria-hidden="true">
                              <span
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, item.portfolioWeightPercentage)
                                  )}%`,
                                }}
                              />
                            </span>
                          </td>

                          <td className="num">
                            <button
                              type="button"
                              onClick={() => handleDeleteHolding(item.id)}
                              className="text-[11px] text-ink-faint hover:text-loss hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredHoldings.length > 0 && (
              <div className="sheet-ft flex flex-wrap items-center justify-between gap-3">
                <span>
                  Cost <span className="fig fig-sm">{formatNepaliCurrency(totalInvested)}</span>
                  <span className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-rule-strong" />
                  Value{' '}
                  <span className="fig fig-sm">{formatNepaliCurrency(totalCurrentValue)}</span>
                  <span className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-rule-strong" />
                  <span
                    className={`fig fig-sm ${
                      isOverallProfit ? 'fig-gain' : isOverallLoss ? 'fig-loss' : ''
                    }`}
                  >
                    {isOverallProfit ? '+' : ''}
                    {formatNepaliCurrency(totalProfitLoss)} (
                    {totalProfitLossPercentage >= 0 ? '+' : ''}
                    {totalProfitLossPercentage.toFixed(2)}%)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-ink-faint hover:text-loss hover:underline"
                >
                  Clear all holdings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* How each column is worked out */}
        <section className="sheet">
          <div className="sheet-hd">
            <h2 className="sheet-title">How these are worked out</h2>
            <span className="sheet-sub">lib/calculations/finance.ts</span>
          </div>
          <div className="sheet-bd">
            <dl className="ledger">
              <div className="ledger-row">
                <dt className="lbl">Cost</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">shares &times; average buy price</dd>
              </div>
              <div className="ledger-row">
                <dt className="lbl">Value</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">shares &times; latest price</dd>
              </div>
              <div className="ledger-row">
                <dt className="lbl">P/L</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">value &minus; cost</dd>
              </div>
              <div className="ledger-row">
                <dt className="lbl">Return</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">P/L &divide; cost &times; 100</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  );
}
