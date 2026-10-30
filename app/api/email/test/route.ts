/**
 * @file app/api/email/test/route.ts
 * @description Test dispatch API: sends the signed-in user a preview of their scheduled summary
 * email, to their own address only. The caller must send their Supabase access token as
 * `Authorization: Bearer <token>`; data is read with that token, so Row-Level Security applies.
 * Monthly previews cover the previous English month, weekly previews the last 7 days, matching
 * what the scheduled emails contain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculateCategoryBreakdown,
  calculateMonthlySavings,
  calculatePortfolioAnalytics,
  calculateSavingsRate,
  calculateTotalByType,
} from '@/lib/calculations/finance';
import { sendFinancialSummaryEmail } from '@/lib/email';
import { EmailFrequency, StockHolding, SummaryEmailReportData, Transaction } from '@/types';

export const dynamic = 'force-dynamic';

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

/** Inclusive start / exclusive end dates (YYYY-MM-DD, Nepal time) of the period a preview covers. */
function previewPeriod(frequency: EmailFrequency): { start: string; end: string } {
  const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
  const today = new Date(Date.now() + NPT_OFFSET_MS);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  if (frequency === 'monthly') {
    const y = today.getUTCFullYear();
    const m = today.getUTCMonth();
    return { start: ymd(new Date(Date.UTC(y, m - 1, 1))), end: ymd(new Date(Date.UTC(y, m, 1))) };
  }
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { start: ymd(weekAgo), end: ymd(tomorrow) };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Please sign in again.' }, { status: 401 });
    }

    // A client acting as the signed-in user: it can only read their own rows.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    );
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user?.email) {
      return NextResponse.json({ success: false, error: 'Please sign in again.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const frequency: EmailFrequency = body.frequency === 'monthly' ? 'monthly' : 'weekly';
    const targetEmail = auth.user.email;
    const userId = auth.user.id;

    // Same period as the scheduled email: previous English month, or the last 7 days.
    const { start, end } = previewPeriod(frequency);

    const [txRes, holdingsRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, type, amount, category, description, date')
        .eq('user_id', userId)
        .gte('date', start)
        .lt('date', end),
      supabase.from('holdings').select('*').eq('user_id', userId),
    ]);
    if (txRes.error || holdingsRes.error) {
      return NextResponse.json({ success: false, error: 'Could not load your data.' }, { status: 500 });
    }
    const transactions: Transaction[] = (txRes.data || []).map(rowToTransaction);
    const holdings: StockHolding[] = (holdingsRes.data || []).map(rowToHolding);

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

    const portfolioSummary = calculatePortfolioAnalytics(holdings);
    const hasActivity = transactions.length > 0 || holdings.length > 0;

    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const reportDateStr = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
    }).format(new Date());

    const emailReportData: SummaryEmailReportData = {
      userEmail: targetEmail,
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

    const sendResult = await sendFinancialSummaryEmail(emailReportData);

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, error: sendResult.error || 'Failed to dispatch email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test ${frequency} financial summary email sent to ${targetEmail}`,
      id: sendResult.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process test email' },
      { status: 500 }
    );
  }
}
