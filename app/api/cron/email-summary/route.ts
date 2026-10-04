/**
 * @file app/api/cron/email-summary/route.ts
 * @description Scheduled Cron Job API endpoint for dispatching automated financial summaries.
 * Designed to run daily on Vercel Cron (or external schedulers). Inspects user preferences,
 * determines who is due for a weekly or monthly digest, computes their financial metrics using
 * the pure calculation engine in lib/calculations/finance.ts, and delivers the summary via Resend.
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
 * Validates request authorization.
 * Allows Vercel Cron automatic header `x-vercel-cron` or `Authorization: Bearer <CRON_SECRET>`.
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // In local development or if CRON_SECRET is not configured, permit testing
  if (!cronSecret) {
    return true;
  }

  // Check Vercel Cron header
  const isVercelCron = Boolean(request.headers.get('x-vercel-cron'));
  if (isVercelCron) {
    return true;
  }

  // Check Bearer authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    return token === cronSecret;
  }

  return false;
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
    // 1. Fetch all opted-in preferences
    const { data: preferences, error: prefError } = await adminSupabase
      .from('user_email_preferences')
      .select('*')
      .eq('enabled', true);

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
      const frequency = (pref.frequency || 'weekly') as EmailFrequency;
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
            .eq('user_id', pref.user_id),
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
