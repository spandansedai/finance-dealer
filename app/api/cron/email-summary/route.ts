/**
 * @file app/api/cron/email-summary/route.ts
 * @description Scheduled Cron Job API endpoint for the weekly financial digest.
 * Runs daily on Vercel Cron. Sends to users who chose the weekly schedule in Settings, once every
 * 7 days, covering the last 7 days of entries plus a portfolio snapshot.
 *
 * Monthly summaries are not sent from here: the Supabase Edge Function `monthly-summary` sends
 * them on the 1st of each English month, covering the previous month.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import {
  calculateCategoryBreakdown,
  calculateMonthlySavings,
  calculatePortfolioAnalytics,
  calculateSavingsRate,
  calculateTotalByType,
} from '@/lib/calculations/finance';
import { sendFinancialSummaryEmail } from '@/lib/email';
import { EmailFrequency, StockHolding, SummaryEmailReportData, Transaction } from '@/types';

// Force dynamic execution (never statically cached)
export const dynamic = 'force-dynamic';

/**
 * Validates request authorization: `Authorization: Bearer <CRON_SECRET>`, which Vercel Cron
 * sends automatically when the CRON_SECRET environment variable is set. Headers such as
 * `x-vercel-cron` are not trusted, since any caller can send them. Without CRON_SECRET the
 * route is only open in local development.
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

/** YYYY-MM-DD for the day `days` days before today, in Nepal time. */
function daysAgoInNepal(days: number): string {
  const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
  const local = new Date(Date.now() + NPT_OFFSET_MS - days * 24 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/**
 * Determines whether an opted-in user is due for an email today.
 */
function isUserDue(frequency: EmailFrequency, lastSentAt?: string | null): boolean {
  if (!lastSentAt) {
    return true; // Never received an email before -> due immediately
  }

  const lastSent = new Date(lastSentAt).getTime();
  const now = Date.now();
  const diffDays = (now - lastSent) / (1000 * 60 * 60 * 24);

  if (frequency === 'weekly') {
    // Due every 7 days (threshold at 6.5 days to accommodate slight cron time shifts)
    return diffDays >= 6.5;
  }

  if (frequency === 'monthly') {
    // Due every ~30 days (threshold at 27.5 days)
    return diffDays >= 27.5;
  }

  return false;
}

/**
 * Maps raw database holdings row to standard StockHolding shape.
 */
function rowToHolding(row: any): StockHolding {
  return {
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
  };
}

/**
 * Maps raw database transactions row to standard Transaction shape.
 */
function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount ?? 0),
    category: row.category,
    description: row.description || '',
    date: row.date,
  };
}

/**
 * Handles the cron execution logic.
 */
async function processCronJob(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing CRON_SECRET authorization.' },
      { status: 401 }
    );
  }

  let adminSupabase;
  try {
    adminSupabase = getSupabaseAdminClient();
  } catch (err: any) {
    console.error('[Cron Job] Failed to initialize Supabase admin client:', err.message);
    return NextResponse.json(
      { error: 'Server configuration error: missing SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    );
  }

  const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const reportDateStr = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
  }).format(new Date());

  const results = {
    timestamp: new Date().toISOString(),
    totalOptedIn: 0,
    dueUsers: 0,
    sentSuccess: 0,
    skippedNotDue: 0,
    errors: [] as Array<{ userId: string; error: string }>,
  };

  try {
    // 1. Fetch users opted in to the weekly digest (monthly is sent by the Supabase function)
    const { data: preferences, error: prefError } = await adminSupabase
      .from('user_email_preferences')
      .select('*')
      .eq('enabled', true)
      .eq('frequency', 'weekly');

    if (prefError) {
      console.error('[Cron Job] Failed to fetch email preferences:', prefError);
      return NextResponse.json(
        { error: 'Database query failed', details: prefError.message },
        { status: 500 }
      );
    }

    const optedInList = preferences || [];
    results.totalOptedIn = optedInList.length;

    // 2. Iterate through each opted-in user
    for (const pref of optedInList) {
      const frequency: EmailFrequency = 'weekly';
      const isDue = isUserDue(frequency, pref.last_sent_at);

      if (!isDue) {
        results.skippedNotDue++;
        continue;
      }

      results.dueUsers++;

      try {
        // 3. Pull user transactions & holdings using admin service role
        const [txRes, holdingsRes] = await Promise.all([
          adminSupabase
            .from('transactions')
            .select('id, type, amount, category, description, date')
            .eq('user_id', pref.user_id)
            // The last 7 days, today included.
            .gt('date', daysAgoInNepal(7)),
          adminSupabase
            .from('holdings')
            .select('*')
            .eq('user_id', pref.user_id),
        ]);

        if (txRes.error) {
          throw new Error(`Failed to load transactions: ${txRes.error.message}`);
        }
        if (holdingsRes.error) {
          throw new Error(`Failed to load holdings: ${holdingsRes.error.message}`);
        }

        const transactions: Transaction[] = (txRes.data || []).map(rowToTransaction);
        const rawHoldings: StockHolding[] = (holdingsRes.data || []).map(rowToHolding);

        // 4. Compute financial metrics using pure calculations engine
        const totalIncome = calculateTotalByType(transactions, 'income');
        const totalExpenses = calculateTotalByType(transactions, 'expense');
        const netSavings = calculateMonthlySavings(totalIncome, totalExpenses);
        const savingsRate = calculateSavingsRate(totalIncome, totalExpenses);

        const categoryMap = calculateCategoryBreakdown(transactions, 'expense');
        const topExpenseCategories = Object.entries(categoryMap)
          .map(([cat, amount]) => ({
            category: cat,
            amount,
            percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

        const portfolioSummary = calculatePortfolioAnalytics(rawHoldings);

        const hasActivity = transactions.length > 0 || rawHoldings.length > 0;

        const emailReportData: SummaryEmailReportData = {
          userEmail: pref.email,
          frequency,
          reportDate: reportDateStr,
          monthlyIncome: totalIncome,
          monthlyExpenses: totalExpenses,
          netSavings,
          savingsRate,
          totalInvested: portfolioSummary.totalInvested,
          totalPortfolioValue: portfolioSummary.totalCurrentValue,
          totalProfitLoss: portfolioSummary.totalProfitLoss,
          totalProfitLossPercentage: portfolioSummary.totalProfitLossPercentage,
          holdings: portfolioSummary.holdings,
          topExpenseCategories,
          hasActivity,
          appUrl,
        };

        // 5. Send email via Resend
        const sendResult = await sendFinancialSummaryEmail(emailReportData);

        if (!sendResult.success) {
          throw new Error(sendResult.error || 'Email dispatch failed');
        }

        // 6. Update last_sent_at timestamp in user_email_preferences
        const { error: updateError } = await adminSupabase
          .from('user_email_preferences')
          .update({
            last_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', pref.user_id);

        if (updateError) {
          console.warn(
            `[Cron Job] Email sent but failed to update last_sent_at for user ${pref.user_id}:`,
            updateError
          );
        }

        results.sentSuccess++;
      } catch (userErr: any) {
        console.error(`[Cron Job] Error processing summary for user ${pref.user_id}:`, userErr);
        results.errors.push({
          userId: pref.user_id,
          error: userErr.message || 'Unknown processing error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.dueUsers} due users (${results.sentSuccess} sent, ${results.errors.length} failed).`,
      results,
    });
  } catch (fatalErr: any) {
    console.error('[Cron Job] Fatal cron execution error:', fatalErr);
    return NextResponse.json(
      { success: false, error: fatalErr.message || 'Fatal error during cron execution' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return processCronJob(request);
}

export async function POST(request: NextRequest) {
  return processCronJob(request);
}
