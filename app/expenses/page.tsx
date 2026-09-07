'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Transaction, TransactionType } from '@/types';
import { calculateNetSavings, calculateSavingsRate, calculateTotalByType } from '@/lib/calculations/finance';
import { supabase } from '@/lib/supabase';

// Shape of a row as stored in the `transactions` table.
interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const rowToTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  type: row.type,
  amount: Number(row.amount),
  category: row.category,
  description: row.description,
  date: row.date,
});

const INCOME_CATEGORIES = [
  'Salary',
  'Side Hustle',
  'Bonus / Allowance',
  'Dividend & Returns',
  'Freelance',
  'Other Income',
];

const EXPENSE_CATEGORIES = [
  'Rent',
  'Food & Groceries',
  'Utilities',
  'Entertainment',
  'Transportation',
  'Healthcare',
  'Shopping',
  'Education',
  'Other Expense',
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    type: 'income',
    amount: 65000,
    category: 'Salary',
    description: 'Primary Software Engineering Salary',
    date: '2026-08-01',
  },
  {
    id: 'tx-2',
    type: 'income',
    amount: 15000,
    category: 'Side Hustle',
    description: 'Consulting & Website Maintenance',
    date: '2026-08-10',
  },
  {
    id: 'tx-3',
    type: 'expense',
    amount: 18000,
    category: 'Rent',
    description: 'Apartment monthly rent (Kathmandu)',
    date: '2026-08-02',
  },
  {
    id: 'tx-4',
    type: 'expense',
    amount: 8500,
    category: 'Food & Groceries',
    description: 'Bhatbhateni supermarket monthly groceries',
    date: '2026-08-05',
  },
  {
    id: 'tx-5',
    type: 'expense',
    amount: 3200,
    category: 'Utilities',
    description: 'Electricity (NEA), Water, & WorldLink fiber internet',
    date: '2026-08-07',
  },
  {
    id: 'tx-6',
    type: 'expense',
    amount: 4500,
    category: 'Entertainment',
    description: 'Weekend dining & movies',
    date: '2026-08-12',
  },
];

export default function ExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auth + data loading state
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Rent');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount, category, description, date')
      .order('date', { ascending: false });

    if (error) {
      setLoadError('Could not load your transactions. Please try refreshing the page.');
      setLoadingTransactions(false);
      return;
    }

    setTransactions((data ?? []).map(rowToTransaction));
    setLoadingTransactions(false);
  };

  // Check auth session, then load this user's transactions from Supabase.
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;

      setUserId(data.user?.id ?? null);
      setAuthChecked(true);

      if (data.user) {
        await loadTransactions();
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user) {
        await loadTransactions();
      } else {
        setTransactions([]);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Switch category list when type changes
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!userId) {
      setFormError('You need to be signed in to add transactions.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please provide a description or note for this transaction.');
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type,
        amount: parsedAmount,
        category,
        description: description.trim(),
        date: date || new Date().toISOString().split('T')[0],
      })
      .select('id, type, amount, category, description, date')
      .single();

    setSubmitting(false);

    if (error || !data) {
      setFormError('Could not save the transaction. Please try again.');
      return;
    }

    setTransactions((prev) => [rowToTransaction(data), ...prev]);

    // Reset Form
    setAmount('');
    setDescription('');
    setFormError(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) {
      setLoadError('Could not delete that transaction. Please try again.');
      return;
    }

    setTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = async () => {
    if (!userId) return;

    const { error } = await supabase.from('transactions').delete().eq('user_id', userId);

    if (error) {
      setLoadError('Could not clear your records. Please try again.');
      return;
    }

    setTransactions([]);
  };

  const handleLoadSampleData = async () => {
    if (!userId) return;

    const sampleRows = INITIAL_TRANSACTIONS.map(({ type: t, amount: a, category: c, description: d, date: dt }) => ({
      user_id: userId,
      type: t,
      amount: a,
      category: c,
      description: d,
      date: dt,
    }));

    const { error } = await supabase.from('transactions').insert(sampleRows);

    if (error) {
      setLoadError('Could not load sample data. Please try again.');
      return;
    }

    await loadTransactions();
  };

  // Calculations
  const totalIncome = calculateTotalByType(transactions, 'income');
  const totalExpenses = calculateTotalByType(transactions, 'expense');
  const netSurplus = calculateNetSavings(totalIncome, totalExpenses);
  const savingsRate = calculateSavingsRate(totalIncome, totalExpenses);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NP', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Filtered List
  const filteredTransactions = transactions.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch =
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Still checking whether a user is signed in.
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </main>
    );
  }

  // No signed-in user: this page requires an account since transactions are per-user.
  if (!userId) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs text-center space-y-3">
          <div className="text-3xl">🔒</div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Sign In Required</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Sign in to view and manage your income and expense records.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {loadError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
            {loadError}
          </div>
        )}
        {loadingTransactions && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Loading transactions...</div>
        )}
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Income & Expense Tracking</h1>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                v0.2 Active
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Log daily expenditures, track income sources, and compute your net monthly surplus for NEPSE investments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Breakdown Metric Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              Monthly Cash Flow Breakdown
            </h2>
            <span className="text-xs text-zinc-500">
              {transactions.length} total logged entries
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Income Card */}
            <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Monthly Income</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                  {transactions.filter((t) => t.type === 'income').length} Sources
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">Rs.</span>
                <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(totalIncome)}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Total inflows from salaries, freelancing, and returns
              </p>
            </div>

            {/* Total Expenses Card */}
            <div className="p-6 rounded-2xl border border-rose-500/20 bg-rose-950/10 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Monthly Expenses</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300">
                  {transactions.filter((t) => t.type === 'expense').length} Logged
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">Rs.</span>
                <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(totalExpenses)}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Rent, food, utilities, and lifestyle spending
              </p>
            </div>

            {/* Net Surplus Card */}
            <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-950/10 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Net Monthly Surplus</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                  {savingsRate}% Savings Rate
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">Rs.</span>
                <span className={`text-3xl font-extrabold tracking-tight ${netSurplus >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(netSurplus)}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Investment Capacity (Income − Expenses) ready for NEPSE
              </p>
            </div>
          </div>

          {/* Surplus Investment Banner */}
          {netSurplus > 0 ? (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>
                  <strong>Investment Ready:</strong> You have <strong>Rs. {formatCurrency(netSurplus)}</strong> available this month to deploy into NEPSE stocks or your emergency fund.
                </span>
              </div>
              <Link href="/portfolio" className="font-semibold underline hover:text-emerald-900 dark:hover:text-emerald-200">
                View Portfolio →
              </Link>
            </div>
          ) : netSurplus < 0 ? (
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Deficit Alert:</strong> Your expenses exceed your income by <strong>Rs. {formatCurrency(Math.abs(netSurplus))}</strong> this month. Review your variable expenses.
              </span>
            </div>
          ) : null}
        </section>

        {/* Main Content: Form + Transactions List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Income & Expense Input Form */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Add Transaction
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Record a new income stream or daily expense entry.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      type === 'income'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <span>+</span>
                    <span>Income</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      type === 'expense'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <span>−</span>
                    <span>Expense</span>
                  </button>
                </div>
              </div>

              {/* Amount Field */}
              <div>
                <label htmlFor="amount" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Amount (in NPR / Rs.) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 font-semibold text-sm">
                    Rs.
                  </div>
                  <input
                    id="amount"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                  />
                </div>
              </div>

              {/* Category Field */}
              <div>
                <label htmlFor="category" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Category *
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                >
                  {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description / Note */}
              <div>
                <label htmlFor="description" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Description / Note *
                </label>
                <input
                  id="description"
                  type="text"
                  placeholder={type === 'income' ? 'e.g. Monthly salary from company' : 'e.g. Groceries at Bhatbhateni'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                />
              </div>

              {/* Date Field */}
              <div>
                <label htmlFor="date" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition-all transform active:scale-98 disabled:opacity-60 ${
                  type === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-400'
                    : 'bg-rose-600 hover:bg-rose-500 focus:ring-2 focus:ring-rose-400'
                }`}
              >
                {submitting ? 'Saving...' : `+ Add ${type === 'income' ? 'Income' : 'Expense'} Entry`}
              </button>
            </form>
          </div>

          {/* Logged Transactions Table Section */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
            {/* Table Top Controls */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Logged Transactions
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Showing {filteredTransactions.length} of {transactions.length} records
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-medium self-start sm:self-auto">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      filterType === 'all'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    All ({transactions.length})
                  </button>
                  <button
                    onClick={() => setFilterType('income')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      filterType === 'income'
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Income ({transactions.filter((t) => t.type === 'income').length})
                  </button>
                  <button
                    onClick={() => setFilterType('expense')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      filterType === 'expense'
                        ? 'bg-rose-600 text-white font-semibold shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Expenses ({transactions.filter((t) => t.type === 'expense').length})
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div>
                <input
                  type="text"
                  placeholder="Search transactions by note or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Table */}
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-3xl">📝</div>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  No transactions found
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {transactions.length === 0
                    ? 'Use the form on the left to add your first income or expense entry.'
                    : 'No records match your search filter.'}
                </p>
                {transactions.length === 0 && userId && (
                  <button
                    onClick={handleLoadSampleData}
                    className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    Load Sample Data
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 text-xs font-medium border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th scope="col" className="py-3 px-4">Date</th>
                      <th scope="col" className="py-3 px-4">Description</th>
                      <th scope="col" className="py-3 px-4">Category</th>
                      <th scope="col" className="py-3 px-4 text-right">Amount</th>
                      <th scope="col" className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                    {filteredTransactions.map((item) => {
                      const isIncome = item.type === 'income';
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group"
                        >
                          {/* Date */}
                          <td className="py-3.5 px-4 text-xs font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {item.date}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
                              {item.description}
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isIncome
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              {item.category}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-xs sm:text-sm whitespace-nowrap">
                            <span
                              className={
                                isIncome
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {isIncome ? '+' : '−'} Rs. {formatCurrency(item.amount)}
                            </span>
                          </td>

                          {/* Delete Button */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteTransaction(item.id)}
                              title="Delete Transaction"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors inline-flex items-center justify-center"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer */}
            {filteredTransactions.length > 0 && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  Net for selected list:{' '}
                  <strong className={
                    calculateNetSavings(
                      calculateTotalByType(filteredTransactions, 'income'),
                      calculateTotalByType(filteredTransactions, 'expense')
                    ) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }>
                    Rs. {formatCurrency(
                      calculateNetSavings(
                        calculateTotalByType(filteredTransactions, 'income'),
                        calculateTotalByType(filteredTransactions, 'expense')
                      )
                    )}
                  </strong>
                </span>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-zinc-500 hover:text-rose-600 transition underline"
                >
                  Clear all records
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
