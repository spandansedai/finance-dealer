/**
 * @file app/expenses/page.tsx
 * @description Income and Expense tracking module.
 * Provides a ledger-style interface to log daily financial transactions, categorize 
 * them, and calculate the resulting monthly savings surplus or deficit.
 * Persists data to Supabase for authenticated users and ephemeral state for guests.
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Account, AccountTransfer, AccountType, Transaction, TransactionType } from '@/types';
import { calculateNetSavings, calculateSavingsRate, calculateTotalByType } from '@/lib/calculations/finance';
import { supabase } from '@/lib/supabase';
import { useGuestMode } from '@/context/GuestModeContext';
import { AccountsManager } from '@/components/AccountsManager';

/**
 * Interface representing a raw transaction record from the database.
 */
interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  account_id: string | null;
}

/**
 * Normalizes a database row into a standard Transaction object.
 * 
 * @param row - Raw data object from Supabase.
 * @returns Standardized Transaction object.
 */
const rowToTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  type: row.type,
  amount: Number(row.amount),
  category: row.category,
  description: row.description,
  date: row.date,
  accountId: row.account_id,
});

interface TransferRow {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number | string;
  date: string;
  note: string;
}

const rowToTransfer = (row: TransferRow): AccountTransfer => ({
  id: row.id,
  fromAccountId: row.from_account_id,
  toAccountId: row.to_account_id,
  amount: Number(row.amount),
  date: row.date,
  note: row.note,
});

/**
 * Standard classification for income streams.
 */
const INCOME_CATEGORIES = [
  'Salary',
  'Side Hustle',
  'Bonus / Allowance',
  'Dividend & Returns',
  'Freelance',
  'Other Income',
];

/**
 * Standard classification for monthly expense outflows.
 */
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

/**
 * Default number of transaction items shown per page.
 */
const ITEMS_PER_PAGE = 10;

/**
 * The Expenses & Income Page component.
 * Manages transaction entry, list filtering, and core cash flow calculations.
 */
export default function ExpensesPage() {
  const {
    guestTransactions,
    addGuestTransaction,
    deleteGuestTransaction,
    clearGuestTransactions,
    guestAccounts,
    guestTransfers,
    addGuestAccount,
    renameGuestAccount,
    deleteGuestAccount,
    addGuestTransfer,
  } = useGuestMode();

  const [dbTransactions, setDbTransactions] = useState<Transaction[]>([]);
  const [dbAccounts, setDbAccounts] = useState<Account[]>([]);
  const [dbTransfers, setDbTransfers] = useState<AccountTransfer[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Auth + data loading state
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form State for new transaction entries
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Rent');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountId, setAccountId] = useState<string>('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);

  /**
   * Loads user transactions from the Supabase database.
   */
  const loadTransactions = async () => {
    setLoadingTransactions(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount, category, description, date, account_id')
      .order('date', { ascending: false });

    if (error) {
      setLoadError('Could not load your transactions. Please try refreshing the page.');
      setLoadingTransactions(false);
      return;
    }

    setDbTransactions((data ?? []).map(rowToTransaction));
    setLoadingTransactions(false);
  };

  const loadAccountData = async () => {
    const [accountsResult, transfersResult] = await Promise.all([
      supabase.from('accounts').select('id, name, type').order('created_at'),
      supabase.from('transfers').select('id, from_account_id, to_account_id, amount, date, note').order('date', { ascending: false }),
    ]);
    if (accountsResult.error || transfersResult.error) {
      setAccountError('Could not load accounts or transfers. Please try refreshing.');
      return;
    }
    setDbAccounts((accountsResult.data ?? []) as Account[]);
    setDbTransfers((transfersResult.data ?? []).map(rowToTransfer));
  };

  // Lifecycle: Handle initial authentication check and setup listeners
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;

      const currentUserId = data.user?.id ?? null;
      setUserId(currentUserId);
      setAuthChecked(true);

      if (currentUserId) {
        await Promise.all([loadTransactions(), loadAccountData()]);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);
      if (currentUserId) {
        await Promise.all([loadTransactions(), loadAccountData()]);
      } else {
        setDbTransactions([]);
        setDbAccounts([]);
        setDbTransfers([]);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery]);

  /**
   * Updates the selected transaction type and resets category to the first default.
   * 
   * @param newType - 'income' or 'expense'
   */
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
    }
  };

  /**
   * Handles submission of the transaction entry form.
   * Persists to Supabase (Auth) or RAM (Guest).
   * 
   * @param e - Form event.
   */
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please provide a description or note for this transaction.');
      return;
    }

    const txDate = date || new Date().toISOString().split('T')[0];

    // Branch logic: Persist based on authentication status
    if (userId) {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type,
          amount: parsedAmount,
          category,
          description: description.trim(),
          date: txDate,
          account_id: accountId || null,
        })
        .select('id, type, amount, category, description, date, account_id')
        .single();

      setSubmitting(false);

      if (error || !data) {
        setFormError('Could not save the transaction. Please try again.');
        return;
      }

      setDbTransactions((prev) => [rowToTransaction(data), ...prev]);
    } else {
      // Guest mode: save to in-memory context memory
      addGuestTransaction({
        type,
        amount: parsedAmount,
        category,
        description: description.trim(),
        date: txDate,
        accountId: accountId || null,
      });
    }

    // Reset Form fields on success and jump to first page to see the newly added item
    setAmount('');
    setDescription('');
    setFormError(null);
    setCurrentPage(1);
  };

  /**
   * Removes a transaction record.
   * 
   * @param id - The transaction identifier.
   */
  const handleDeleteTransaction = async (id: string) => {
    if (userId) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);

      if (error) {
        setLoadError('Could not delete that transaction. Please try again.');
        return;
      }

      setDbTransactions((prev) => prev.filter((item) => item.id !== id));
    } else {
      deleteGuestTransaction(id);
    }
  };

  const handleClearAll = async () => {
    if (userId) {
      const { error } = await supabase.from('transactions').delete().eq('user_id', userId);

      if (error) {
        setLoadError('Could not clear your records. Please try again.');
        return;
      }

      setDbTransactions([]);
    } else {
      clearGuestTransactions();
    }
  };

  // Select active dataset based on login status
  const activeTransactions = userId ? dbTransactions : guestTransactions;
  const activeAccounts = userId ? dbAccounts : guestAccounts;
  const activeTransfers = userId ? dbTransfers : guestTransfers;

  const accountBalances = activeAccounts.reduce<Record<string, number>>((balances, account) => {
    balances[account.id] = 0;
    return balances;
  }, {});
  activeTransactions.forEach((transaction) => {
    if (!transaction.accountId || !(transaction.accountId in accountBalances)) return;
    accountBalances[transaction.accountId] += transaction.type === 'income' ? transaction.amount : -transaction.amount;
  });
  activeTransfers.forEach((transfer) => {
    if (transfer.fromAccountId in accountBalances) accountBalances[transfer.fromAccountId] -= transfer.amount;
    if (transfer.toAccountId in accountBalances) accountBalances[transfer.toAccountId] += transfer.amount;
  });

  const handleAddAccount = async (name: string, accountType: AccountType) => {
    setAccountError(null);
    setAccountMessage(null);
    if (!userId) {
      addGuestAccount({ name, type: accountType });
      return true;
    }
    const { data, error } = await supabase
      .from('accounts')
      .insert({ user_id: userId, name, type: accountType })
      .select('id, name, type')
      .single();
    if (error || !data) {
      setAccountError('Could not add that account. Please try again.');
      return false;
    }
    setDbAccounts((previous) => [...previous, data as Account]);
    return true;
  };

  const handleRenameAccount = async (id: string, name: string) => {
    setAccountError(null);
    setAccountMessage(null);
    if (!userId) {
      renameGuestAccount(id, name);
      return true;
    }
    const { error } = await supabase.from('accounts').update({ name }).eq('id', id);
    if (error) {
      setAccountError('Could not rename that account. Please try again.');
      return false;
    }
    setDbAccounts((previous) => previous.map((account) => account.id === id ? { ...account, name } : account));
    return true;
  };

  const handleDeleteAccount = async (id: string) => {
    setAccountError(null);
    setAccountMessage(null);
    const hasHistory = activeTransactions.some((transaction) => transaction.accountId === id)
      || activeTransfers.some((transfer) => transfer.fromAccountId === id || transfer.toAccountId === id);
    if (hasHistory) {
      setAccountError('This account cannot be deleted because it has linked transactions or transfers. Keep it to preserve its history.');
      return false;
    }
    if (!userId) {
      deleteGuestAccount(id);
      if (accountId === id) setAccountId('');
      return true;
    }
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) {
      setAccountError('Could not delete that account. It may have linked history.');
      return false;
    }
    setDbAccounts((previous) => previous.filter((account) => account.id !== id));
    if (accountId === id) setAccountId('');
    return true;
  };

  const handleTransfer = async (fromAccountId: string, toAccountId: string, transferAmount: number, transferDate: string, note: string) => {
    setAccountError(null);
    setAccountMessage(null);
    if (fromAccountId === toAccountId || transferAmount <= 0) {
      setAccountError('Choose two different accounts and a positive transfer amount.');
      return false;
    }
    if (!userId) {
      addGuestTransfer({ fromAccountId, toAccountId, amount: transferAmount, date: transferDate, note });
      setAccountMessage('Transfer recorded. It affects account balances only.');
      return true;
    }
    const { data, error } = await supabase
      .from('transfers')
      .insert({ user_id: userId, from_account_id: fromAccountId, to_account_id: toAccountId, amount: transferAmount, date: transferDate, note })
      .select('id, from_account_id, to_account_id, amount, date, note')
      .single();
    if (error || !data) {
      setAccountError('Could not record the transfer. Please try again.');
      return false;
    }
    setDbTransfers((previous) => [rowToTransfer(data), ...previous]);
    setAccountMessage('Transfer recorded. It affects account balances only.');
    return true;
  };

  // Derive cash flow aggregates using calculation engine
  const totalIncome = calculateTotalByType(activeTransactions, 'income');
  const totalExpenses = calculateTotalByType(activeTransactions, 'expense');
  const netSurplus = calculateNetSavings(totalIncome, totalExpenses);
  const savingsRate = calculateSavingsRate(totalIncome, totalExpenses);

  /**
   * Formats numbers into Nepali Rupees display format.
   * 
   * @param val - Numeric value.
   * @returns Formatted string.
   */
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NP', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Filtered List based on type filter and search term
  const filteredTransactions = activeTransactions.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch =
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Pagination calculations over the filtered result set
  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {loadError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
            {loadError}
          </div>
        )}
        {accountError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
            {accountError}
          </div>
        )}
        {accountMessage && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
            {accountMessage}
          </div>
        )}
        {loadingTransactions && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Loading transactions...</div>
        )}

        {/* Guest Mode Notice Banner */}
        {!userId && authChecked && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wide shrink-0">
                Try It Out Mode
              </span>
              <span>
                Adding entries in <strong>Guest Mode</strong>. Transactions are kept in memory and will reset when you refresh.
              </span>
            </div>
            <Link
              href="/login"
              className="px-3 py-1 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition self-start sm:self-auto shrink-0 shadow-xs"
            >
              Sign Up / Sign In to Save
            </Link>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Income & Expense Tracking</h1>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                v1.3 Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Log daily expenditures, track income sources, and compute your net monthly surplus for NEPSE investments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Breakdown Metric Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              Monthly Cash Flow Breakdown
            </h2>
            <span className="text-xs text-zinc-500">
              {activeTransactions.length} total logged entries
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {/* Total Income Card */}
            <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Monthly Income</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                  {activeTransactions.filter((t) => t.type === 'income').length} Sources
                </span>
              </div>
              <div className="mt-3 sm:mt-4 flex items-baseline gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-zinc-400 dark:text-zinc-500">Rs.</span>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 break-words">
                  {formatCurrency(totalIncome)}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Total inflows from salaries, freelancing, and returns
              </p>
            </div>

            {/* Total Expenses Card */}
            <div className="p-5 sm:p-6 rounded-2xl border border-rose-500/20 bg-rose-950/10 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Monthly Expenses</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300">
                  {activeTransactions.filter((t) => t.type === 'expense').length} Logged
                </span>
              </div>
              <div className="mt-3 sm:mt-4 flex items-baseline gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-zinc-400 dark:text-zinc-500">Rs.</span>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 break-words">
                  {formatCurrency(totalExpenses)}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Rent, food, utilities, and lifestyle spending
              </p>
            </div>

            {/* Net Surplus Card */}
            <div className="p-5 sm:p-6 rounded-2xl border border-blue-500/20 bg-blue-950/10 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 shadow-xs transition-all hover:shadow-md sm:col-span-2 md:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">Net Monthly Surplus</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                  {savingsRate}% Savings Rate
                </span>
              </div>
              <div className="mt-3 sm:mt-4 flex items-baseline gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-zinc-400 dark:text-zinc-500">Rs.</span>
                <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight break-words ${netSurplus >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(netSurplus)}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Investment Capacity ready for NEPSE
              </p>
            </div>
          </div>

          {/* Surplus Investment Banner */}
          {netSurplus > 0 ? (
            <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">💡</span>
                <span>
                  <strong>Investment Ready:</strong> You have <strong>Rs. {formatCurrency(netSurplus)}</strong> available this month to deploy into NEPSE stocks.
                </span>
              </div>
              <Link href="/portfolio" className="font-semibold underline hover:text-emerald-900 dark:hover:text-emerald-200 self-start sm:self-auto shrink-0">
                View Portfolio →
              </Link>
            </div>
          ) : netSurplus < 0 ? (
            <div className="p-3.5 sm:p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <span>
                <strong>Deficit Alert:</strong> Your expenses exceed your income by <strong>Rs. {formatCurrency(Math.abs(netSurplus))}</strong> this month.
              </span>
            </div>
          ) : null}
        </section>

        <AccountsManager
          accounts={activeAccounts}
          balances={accountBalances}
          onAdd={handleAddAccount}
          onRename={handleRenameAccount}
          onDelete={handleDeleteAccount}
          onTransfer={handleTransfer}
        />

        {/* Main Content: Form + Transactions List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Income & Expense Input Form */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Add Transaction {!userId && <span className="text-xs font-normal text-amber-600 dark:text-amber-400">(Guest Mode)</span>}
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
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                    className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
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
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
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
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
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
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                />
              </div>

              <div>
                <label htmlFor="account" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Account <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <select
                  id="account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                >
                  <option value="">No account selected</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition-all transform active:scale-98 ${
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
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Logged Transactions
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {totalItems === 0
                      ? '0 records'
                      : `Showing ${startIndex + 1}–${endIndex} of ${totalItems} records${
                          totalItems !== activeTransactions.length
                            ? ` (filtered from ${activeTransactions.length})`
                            : ''
                        }`}
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-medium self-start sm:self-auto">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    All ({activeTransactions.length})
                  </button>
                  <button
                    onClick={() => setFilterType('income')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      filterType === 'income'
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Income ({activeTransactions.filter((t) => t.type === 'income').length})
                  </button>
                  <button
                    onClick={() => setFilterType('expense')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      filterType === 'expense'
                        ? 'bg-rose-600 text-white font-semibold shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Expenses ({activeTransactions.filter((t) => t.type === 'expense').length})
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
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-base sm:text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Table */}
            {filteredTransactions.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-3">
                <div className="text-3xl">📝</div>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  No transactions found
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {activeTransactions.length === 0
                    ? 'Use the form on the left to add your first income or expense entry.'
                    : 'No records match your search filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 text-xs font-medium border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th scope="col" className="py-3 px-3 sm:px-4">Date</th>
                      <th scope="col" className="py-3 px-3 sm:px-4">Description</th>
                      <th scope="col" className="py-3 px-3 sm:px-4">Category</th>
                      <th scope="col" className="py-3 px-3 sm:px-4 text-right">Amount</th>
                      <th scope="col" className="py-3 px-3 sm:px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                    {paginatedTransactions.map((item) => {
                      const isIncome = item.type === 'income';
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group"
                        >
                          {/* Date */}
                          <td className="py-3.5 px-3 sm:px-4 text-xs font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {item.date}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-3 sm:px-4">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm max-w-[160px] sm:max-w-none truncate">
                              {item.description}
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium ${
                                isIncome
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              {item.category}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-3 sm:px-4 text-right font-mono font-bold text-xs sm:text-sm whitespace-nowrap">
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
                          <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteTransaction(item.id)}
                              title="Delete Transaction"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors inline-flex items-center justify-center cursor-pointer"
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

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="p-3 sm:p-4 bg-zinc-50/70 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
                  Page <span className="font-semibold text-zinc-800 dark:text-zinc-200">{effectivePage}</span> of{' '}
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{totalPages}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={effectivePage <= 1}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium shadow-2xs cursor-pointer"
                  >
                    ← Prev
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const isCurrent = pageNum === effectivePage;
                      if (
                        totalPages > 7 &&
                        pageNum !== 1 &&
                        pageNum !== totalPages &&
                        Math.abs(pageNum - effectivePage) > 1
                      ) {
                        if (
                          (pageNum === 2 && effectivePage > 3) ||
                          (pageNum === totalPages - 1 && effectivePage < totalPages - 2)
                        ) {
                          return (
                            <span key={pageNum} className="px-1 text-zinc-400">
                              …
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={effectivePage >= totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium shadow-2xs cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Table Footer */}
            {filteredTransactions.length > 0 && (
              <div className="p-3.5 sm:p-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
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
                  className="text-xs text-zinc-500 hover:text-rose-600 transition underline cursor-pointer"
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
