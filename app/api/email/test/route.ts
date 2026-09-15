/**
 * @file app/api/email/test/route.ts
 * @description Test dispatch API for authenticated users to send an immediate sample financial summary email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetEmail = body.email;
    const frequency = (body.frequency || 'weekly') as EmailFrequency;
    const userId = body.userId;

    if (!targetEmail) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    let transactions: Transaction[] = [];
    let holdings: StockHolding[] = [];

    if (userId) {
      const [txRes, holdingsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, type, amount, category, description, date')
          .eq('user_id', userId),
        supabase
          .from('holdings')
          .select('*')
          .eq('user_id', userId),
      ]);

      if (txRes.data) {
        transactions = txRes.data.map(rowToTransaction);
      }
      if (holdingsRes.data) {
        holdings = holdingsRes.data.map(rowToHolding);
      }
    }

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
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

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
