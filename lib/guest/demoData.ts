/**
 * @file lib/guest/demoData.ts
 * @description Sample book that Guest Mode opens with, so a visitor sees every
 * feature working — accounts, a Dollar Card, transfers, a reconciliation, NEPSE
 * holdings and a salary plan — instead of a row of empty states.
 *
 * Dates are built relative to today (this month and last month), so the sample
 * never goes stale and the month-over-month insights always have two months to
 * compare. Nothing here is persisted: GuestModeContext seeds its in-memory state
 * from these builders and a reload starts the sample again from scratch.
 */

import { Account, AccountTransfer, BalanceAdjustment, StockHolding, Transaction } from '@/types';
import type { SalaryProfileDraft, SavingsGoalDraft } from '@/context/GuestModeContext';

const ACCOUNT = {
  bank: 'guest-account-demo-bank',
  wallet: 'guest-account-demo-wallet',
  cash: 'guest-account-demo-cash',
  dollar: 'guest-account-demo-dollar',
} as const;

/** NPR per USD used for the sample Dollar Card entries (NRB buying rate). */
const DEMO_USD_RATE = 154.56;

/**
 * ISO date for a given day of the current month (`monthsAgo = 0`) or an earlier
 * month. Days in the current month are clamped to today so the sample never
 * contains future-dated entries.
 */
function demoDate(monthsAgo: number, day: number): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() - monthsAgo;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const clampedDay = monthsAgo === 0 ? Math.min(day, today.getDate()) : Math.min(day, lastDay);
  const date = new Date(year, month, clampedDay);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function buildDemoAccounts(): Account[] {
  return [
    { id: ACCOUNT.bank, name: 'Salary account', type: 'bank' },
    { id: ACCOUNT.wallet, name: 'eSewa', type: 'wallet' },
    { id: ACCOUNT.cash, name: 'Cash in hand', type: 'cash' },
    { id: ACCOUNT.dollar, name: 'Dollar Card', type: 'dollar_card' },
  ];
}

export function buildDemoTransactions(): Transaction[] {
  let seq = 0;
  const tx = (
    monthsAgo: number,
    day: number,
    entry: Omit<Transaction, 'id' | 'date'>
  ): Transaction => ({ id: `guest-tx-demo-${++seq}`, date: demoDate(monthsAgo, day), ...entry });

  const dollar = (monthsAgo: number, day: number, usd: number, category: string, description: string) => {
    const date = demoDate(monthsAgo, day);
    return tx(monthsAgo, day, {
      type: 'expense',
      amount: Number((usd * DEMO_USD_RATE).toFixed(2)),
      category,
      description,
      accountId: ACCOUNT.dollar,
      originalAmount: usd,
      originalCurrency: 'USD',
      exchangeRate: DEMO_USD_RATE,
      exchangeRateDate: date,
      exchangeRateStatus: 'live',
    });
  };

  const transactions: Transaction[] = [
    // Last month
    tx(1, 1, { type: 'income', amount: 95000, category: 'Salary', description: 'Monthly salary', accountId: ACCOUNT.bank, verified: true }),
    tx(1, 3, { type: 'expense', amount: 22000, category: 'Rent', description: 'Flat rent, Baneshwor', accountId: ACCOUNT.bank, verified: true }),
    tx(1, 6, { type: 'expense', amount: 9800, category: 'Food & Groceries', description: 'Bhatbhateni weekly shop', accountId: ACCOUNT.wallet, verified: true }),
    tx(1, 9, { type: 'expense', amount: 2450, category: 'Utilities', description: 'NEA electricity and KUKL water', accountId: ACCOUNT.wallet }),
    tx(1, 14, { type: 'income', amount: 18000, category: 'Freelance', description: 'Logo design for a Pokhara café', accountId: ACCOUNT.bank }),
    tx(1, 18, { type: 'expense', amount: 3200, category: 'Transportation', description: 'Pathao rides', accountId: ACCOUNT.wallet }),
    tx(1, 21, { type: 'expense', amount: 1850, category: 'Entertainment', description: 'Movie night at QFX', accountId: ACCOUNT.cash }),
    dollar(1, 24, 10, 'Education', 'GitHub Copilot subscription'),

    // This month
    tx(0, 1, { type: 'income', amount: 95000, category: 'Salary', description: 'Monthly salary', accountId: ACCOUNT.bank, verified: true }),
    tx(0, 3, { type: 'expense', amount: 22000, category: 'Rent', description: 'Flat rent, Baneshwor', accountId: ACCOUNT.bank, verified: true }),
    tx(0, 5, { type: 'expense', amount: 14600, category: 'Food & Groceries', description: 'Groceries, with family visiting', accountId: ACCOUNT.wallet }),
    tx(0, 8, { type: 'expense', amount: 2610, category: 'Utilities', description: 'NEA electricity and internet', accountId: ACCOUNT.wallet }),
    tx(0, 10, { type: 'expense', amount: 12500, category: 'Shopping', description: 'New jacket and shoes', accountId: ACCOUNT.bank }),
    tx(0, 12, { type: 'income', amount: 4750, category: 'Dividend & Returns', description: 'NABIL cash dividend', accountId: ACCOUNT.bank }),
    tx(0, 15, { type: 'expense', amount: 2900, category: 'Transportation', description: 'Pathao and fuel', accountId: ACCOUNT.wallet }),
    tx(0, 17, { type: 'expense', amount: 1800, category: 'Healthcare', description: 'Pharmacy', accountId: ACCOUNT.cash }),
    dollar(0, 19, 59, 'Education', 'Coursera Plus, one month'),
    dollar(0, 22, 19.99, 'Entertainment', 'Game on Steam'),
  ];

  // Newest first, matching how the ledger prepends new entries.
  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}

export function buildDemoTransfers(): AccountTransfer[] {
  return [
    { id: 'guest-transfer-demo-1', fromAccountId: ACCOUNT.bank, toAccountId: ACCOUNT.dollar, amount: 15000, date: demoDate(0, 18), note: 'Load Dollar Card' },
    { id: 'guest-transfer-demo-2', fromAccountId: ACCOUNT.bank, toAccountId: ACCOUNT.wallet, amount: 25000, date: demoDate(0, 4), note: 'Top up eSewa' },
    { id: 'guest-transfer-demo-3', fromAccountId: ACCOUNT.bank, toAccountId: ACCOUNT.cash, amount: 5000, date: demoDate(1, 20), note: 'ATM withdrawal', verified: true },
    { id: 'guest-transfer-demo-4', fromAccountId: ACCOUNT.bank, toAccountId: ACCOUNT.wallet, amount: 15000, date: demoDate(1, 5), note: 'Top up eSewa', verified: true },
    { id: 'guest-transfer-demo-5', fromAccountId: ACCOUNT.bank, toAccountId: ACCOUNT.dollar, amount: 2000, date: demoDate(1, 23), note: 'Load Dollar Card', verified: true },
  ];
}

export function buildDemoAdjustments(): BalanceAdjustment[] {
  return [
    {
      id: 'guest-adj-demo-1',
      accountId: ACCOUNT.cash,
      amount: -150,
      date: demoDate(0, 20),
      note: 'Counted the wallet; small change unaccounted for',
      verified: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function buildDemoHoldings(): StockHolding[] {
  return [
    { id: 'guest-holding-demo-1', symbol: 'NABIL', companyName: 'Nabil Bank Limited', shares: 150, averagePurchasePrice: 498, currentPrice: 525, sector: 'Commercial Banks' },
    { id: 'guest-holding-demo-2', symbol: 'NICA', companyName: 'NIC Asia Bank Limited', shares: 200, averagePurchasePrice: 410, currentPrice: 388, sector: 'Commercial Banks' },
    { id: 'guest-holding-demo-3', symbol: 'CHCL', companyName: 'Chilime Hydropower Company Limited', shares: 120, averagePurchasePrice: 480, currentPrice: 532, sector: 'Hydro Power' },
    { id: 'guest-holding-demo-4', symbol: 'UPPER', companyName: 'Upper Tamakoshi Hydropower Limited', shares: 100, averagePurchasePrice: 215, currentPrice: 241, sector: 'Hydro Power' },
    { id: 'guest-holding-demo-5', symbol: 'NLIC', companyName: 'Nepal Life Insurance Company Limited', shares: 60, averagePurchasePrice: 720, currentPrice: 694, sector: 'Life Insurance' },
    { id: 'guest-holding-demo-6', symbol: 'HDL', companyName: 'Himalayan Distillery Limited', shares: 20, averagePurchasePrice: 1450, currentPrice: 1612, sector: 'Manufacturing And Processing' },
  ];
}

export function buildDemoSalaryProfile(): SalaryProfileDraft {
  return {
    monthlySalary: 85000,
    monthlyAllowances: 10000,
    monthlyDeductions: 8500,
    expectedMonthlyExpense: 60000,
    savingsTargetAmount: null,
    savingsTargetPercentage: 25,
  };
}

export function buildDemoSavingsGoals(): SavingsGoalDraft[] {
  return [
    { id: 'guest-goal-demo-1', name: 'Emergency fund (6 months)', targetAmount: 360000 },
    { id: 'guest-goal-demo-2', name: 'New laptop', targetAmount: 150000 },
    { id: 'guest-goal-demo-3', name: 'Trip to Mustang', targetAmount: 45000 },
  ];
}
