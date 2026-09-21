/**
 * @file app/expenses/page.tsx
 * @description Income and Expense tracking module with live-derived account balances,
 * dedicated balance adjustment reconciling, transaction verification/locking, and cleanup helpers.
 * Persists data to Supabase for authenticated users and RAM for guest mode.
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Account,
  AccountTransfer,
  AccountType,
  BalanceAdjustment,
  Transaction,
  TransactionType,
} from '@/types';
import {
  calculateAccountBalances,
  calculateNetSavings,
  calculateSavingsRate,
  calculateTotalByType,
} from '@/lib/calculations/finance';
import { supabase } from '@/lib/supabase';
import { useGuestMode } from '@/context/GuestModeContext';
import { AccountsManager } from '@/components/AccountsManager';

/**
 * Interface representing a raw transaction record from the database.
 */
interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number | string;
  category: string;
  description: string;
  date: string;
  account_id: string | null;
  original_amount: number | string | null;
  original_currency: 'USD' | null;
  exchange_rate: number | string | null;
  exchange_rate_date: string | null;
  exchange_rate_status: 'live' | 'stale' | 'manual' | null;
  verified: boolean | null;
}

const rowToTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  type: row.type,
  amount: Number(row.amount),
  category: row.category,
  description: row.description,
  date: row.date,
  accountId: row.account_id,
  originalAmount: row.original_amount === null ? null : Number(row.original_amount),
  originalCurrency: row.original_currency,
  exchangeRate: row.exchange_rate === null ? null : Number(row.exchange_rate),
  exchangeRateDate: row.exchange_rate_date,
  exchangeRateStatus: row.exchange_rate_status,
  verified: Boolean(row.verified),
});

interface FxRateResponse {
  success: boolean;
  buy?: number;
  sell?: number;
  asOf?: string;
  stale?: boolean;
  error?: string;
}

interface TransferRow {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number | string;
  date: string;
  note: string;
  verified: boolean | null;
}

const rowToTransfer = (row: TransferRow): AccountTransfer => ({
  id: row.id,
  fromAccountId: row.from_account_id,
  toAccountId: row.to_account_id,
  amount: Number(row.amount),
  date: row.date,
  note: row.note,
  verified: Boolean(row.verified),
});

interface AdjustmentRow {
  id: string;
  account_id: string;
  amount: number | string;
  date: string;
  note: string;
  verified: boolean | null;
  created_at?: string;
}

const rowToAdjustment = (row: AdjustmentRow): BalanceAdjustment => ({
  id: row.id,
  accountId: row.account_id,
  amount: Number(row.amount),
  date: row.date,
  note: row.note,
  verified: Boolean(row.verified),
  createdAt: row.created_at,
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

const ITEMS_PER_PAGE = 10;

/**
 * Heuristic helper to identify potential legacy fix-up transactions.
 */
function isPotentialFixup(tx: Transaction): boolean {
  if (tx.amount < 0) return true;
  const note = (tx.description || '').toLowerCase();
  const cat = (tx.category || '').toLowerCase();
  const keywords = ['adjust', 'fix', 'reconcil', 'correction', 'drawer', 'mismatch', 'opening', 'balance'];
  return keywords.some((k) => note.includes(k) || cat.includes(k));
}

export default function ExpensesPage() {
  const {
    guestTransactions,
    addGuestTransaction,
    updateGuestTransaction,
    deleteGuestTransaction,
    clearGuestTransactions,
    guestAccounts,
    guestTransfers,
    guestAdjustments,
    addGuestAccount,
    renameGuestAccount,
    deleteGuestAccount,
    addGuestTransfer,
    updateGuestTransfer,
    deleteGuestTransfer,
    addGuestAdjustment,
    updateGuestAdjustment,
    deleteGuestAdjustment,
  } = useGuestMode();

  const [dbTransactions, setDbTransactions] = useState<Transaction[]>([]);
  const [dbAccounts, setDbAccounts] = useState<Account[]>([]);
  const [dbTransfers, setDbTransfers] = useState<AccountTransfer[]>([]);
  const [dbAdjustments, setDbAdjustments] = useState<BalanceAdjustment[]>([]);

  // Filters & Pagination
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'fixups'>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
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
  const [fxRate, setFxRate] = useState<FxRateResponse | null>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [manualUsdRate, setManualUsdRate] = useState('');

  // Modals for Transaction Editing, Unlocking, and Conversion
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [unlockModalTx, setUnlockModalTx] = useState<Transaction | null>(null);
  const [convertModalTx, setConvertModalTx] = useState<Transaction | null>(null);
  const [convertTargetAccountId, setConvertTargetAccountId] = useState<string>('');
  const [convertDeltaAmount, setConvertDeltaAmount] = useState<string>('');

  const activeAccounts = userId ? dbAccounts : guestAccounts;
  const activeTransactions = userId ? dbTransactions : guestTransactions;
  const activeTransfers = userId ? dbTransfers : guestTransfers;
  const activeAdjustments = userId ? dbAdjustments : guestAdjustments;

  const selectedAccount = activeAccounts.find((account) => account.id === accountId);
  const isDollarCardExpense = type === 'expense' && selectedAccount?.type === 'dollar_card';

  /**
   * Loads user transactions from Supabase.
   */
  const loadTransactions = async () => {
    setLoadingTransactions(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount, category, description, date, account_id, original_amount, original_currency, exchange_rate, exchange_rate_date, exchange_rate_status, verified')
      .order('date', { ascending: false });

    if (error) {
      setLoadError('Could not load your transactions. Please try refreshing the page.');
      setLoadingTransactions(false);
      return;
    }

    setDbTransactions((data ?? []).map(rowToTransaction));
    setLoadingTransactions(false);
  };

  /**
   * Loads accounts, transfers, and balance adjustments from Supabase.
   */
  const loadAccountData = async () => {
    const [accountsResult, transfersResult, adjustmentsResult] = await Promise.all([
      supabase.from('accounts').select('id, name, type').order('created_at'),
      supabase.from('transfers').select('id, from_account_id, to_account_id, amount, date, note, verified').order('date', { ascending: false }),
      supabase.from('balance_adjustments').select('id, account_id, amount, date, note, verified, created_at').order('date', { ascending: false }),
    ]);

    if (accountsResult.error || transfersResult.error || adjustmentsResult.error) {
      setAccountError('Could not load accounts, transfers, or balance adjustments. Please refresh.');
      return;
    }

    setDbAccounts((accountsResult.data ?? []) as Account[]);
    setDbTransfers((transfersResult.data ?? []).map(rowToTransfer));
    setDbAdjustments((adjustmentsResult.data ?? []).map(rowToAdjustment));
  };

  // Auth & Lifecycle
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
        setDbAdjustments([]);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isDollarCardExpense) return;
    let cancelled = false;
    const loadFxRate = async () => {
      setFxLoading(true);
      try {
        const response = await fetch('/api/fx-rate');
        const data = await response.json() as FxRateResponse;
        if (!cancelled) setFxRate(data);
      } catch {
        if (!cancelled) {
          setFxRate({
            success: false,
            error: 'Could not reach the FinanceDealer FX service. Enter a manual NPR-per-USD rate to continue.',
          });
        }
      } finally {
        if (!cancelled) setFxLoading(false);
      }
    };
    loadFxRate();
    return () => {
      cancelled = true;
    };
  }, [isDollarCardExpense]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterAccount, searchQuery]);

  // LIVE CALCULATED ACCOUNT BALANCES - derived fresh on every render
  const accountBalances = useMemo(() => {
    return calculateAccountBalances(activeAccounts, activeTransactions, activeTransfers, activeAdjustments);
  }, [activeAccounts, activeTransactions, activeTransfers, activeAdjustments]);

  const potentialFixupsCount = useMemo(() => {
    return activeTransactions.filter(isPotentialFixup).length;
  }, [activeTransactions]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
    }
  };

  /**
   * Add transaction handler
   */
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const enteredAmount = parseFloat(amount);
    if (!enteredAmount || isNaN(enteredAmount) || enteredAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    const txDate = date || new Date().toISOString().split('T')[0];
    const manualRate = Number(manualUsdRate);
    const hasLiveRate = Boolean(fxRate?.success && fxRate.sell && fxRate.sell > 0 && !fxRate.stale);
    const hasStaleRate = Boolean(fxRate?.success && fxRate.sell && fxRate.sell > 0 && fxRate.stale);
    const effectiveUsdRate = hasLiveRate || hasStaleRate ? fxRate!.sell! : manualRate > 0 ? manualRate : null;

    if (isDollarCardExpense && !effectiveUsdRate) {
      setFormError('The NRB rate is unavailable. Enter a positive manual NPR-per-USD rate to log this Dollar Card expense.');
      return;
    }

    const parsedAmount = isDollarCardExpense && effectiveUsdRate ? Number((enteredAmount * effectiveUsdRate).toFixed(2)) : enteredAmount;
    const exchangeRateStatus = isDollarCardExpense ? (hasLiveRate ? 'live' : hasStaleRate ? 'stale' : 'manual') : null;
    const exchangeRateDate = isDollarCardExpense ? (hasLiveRate || hasStaleRate ? fxRate?.asOf ?? txDate : txDate) : null;

    if (!description.trim()) {
      setFormError('Please provide a description or note for this transaction.');
      return;
    }

    if (userId) {
      setSubmitting(true);
      const { data: inserted, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type,
          amount: parsedAmount,
          category,
          description: description.trim(),
          date: txDate,
          account_id: accountId || null,
          original_amount: isDollarCardExpense ? enteredAmount : null,
          original_currency: isDollarCardExpense ? 'USD' : null,
          exchange_rate: isDollarCardExpense ? effectiveUsdRate : null,
          exchange_rate_date: exchangeRateDate,
          exchange_rate_status: exchangeRateStatus,
          verified: false,
        })
        .select('id, type, amount, category, description, date, account_id, original_amount, original_currency, exchange_rate, exchange_rate_date, exchange_rate_status, verified')
        .single();

      setSubmitting(false);

      if (error || !inserted) {
        setFormError('Could not save the transaction. Please try again.');
        return;
      }

      setDbTransactions((prev) => [rowToTransaction(inserted), ...prev]);
    } else {
      addGuestTransaction({
        type,
        amount: parsedAmount,
        category,
        description: description.trim(),
        date: txDate,
        accountId: accountId || null,
        originalAmount: isDollarCardExpense ? enteredAmount : null,
        originalCurrency: isDollarCardExpense ? 'USD' : null,
        exchangeRate: isDollarCardExpense ? effectiveUsdRate : null,
        exchangeRateDate: exchangeRateDate,
        exchangeRateStatus,
        verified: false,
      });
    }

    setAmount('');
    setDescription('');
    setManualUsdRate('');
    setFormError(null);
    setCurrentPage(1);
  };

  /**
   * Delete transaction handler (strictly for unverified transactions; verified transactions must be unlocked first)
   */
  const executeDeleteTransaction = async (id: string) => {
    const target = activeTransactions.find((tx) => tx.id === id);
    if (target?.verified) {
      setAccountError('This transaction is verified and locked against deletion. Unlock it first to delete.');
      return;
    }
    if (userId) {
      const { error } = await supabase.from('transactions').delete().eq('id', id).eq('verified', false);
      if (error) {
        setLoadError('Could not delete that transaction. Please try again.');
        return;
      }
      setDbTransactions((prev) => prev.filter((item) => item.id !== id));
    } else {
      deleteGuestTransaction(id);
    }
    setAccountMessage('Transaction deleted.');
  };

  /**
   * Toggle Verification on Transaction
   */
  const handleToggleVerifyTransaction = async (tx: Transaction) => {
    if (tx.verified) {
      // Unlocking requires explicit confirmation prompt
      setUnlockModalTx(tx);
    } else {
      // Marking verified
      if (userId) {
        const { error } = await supabase.from('transactions').update({ verified: true }).eq('id', tx.id);
        if (error) {
          setAccountError('Could not verify transaction. Please try again.');
          return;
        }
        setDbTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, verified: true } : t)));
      } else {
        updateGuestTransaction(tx.id, { verified: true });
      }
      setAccountMessage('Transaction marked as verified and locked against accidental edits.');
    }
  };

  const confirmUnlockTransaction = async () => {
    if (!unlockModalTx) return;
    if (userId) {
      const { error } = await supabase.from('transactions').update({ verified: false }).eq('id', unlockModalTx.id);
      if (error) {
        setAccountError('Could not unlock transaction. Please try again.');
        return;
      }
      setDbTransactions((prev) => prev.map((t) => (t.id === unlockModalTx.id ? { ...t, verified: false } : t)));
    } else {
      updateGuestTransaction(unlockModalTx.id, { verified: false });
    }
    if (editingTx && editingTx.id === unlockModalTx.id) {
      setEditingTx({ ...editingTx, verified: false });
    }
    setUnlockModalTx(null);
    setAccountMessage('Transaction unlocked. Changes can now be made.');
  };

  /**
   * Edit Transaction handler
   */
  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(String(tx.amount));
    setEditCategory(tx.category);
    setEditDescription(tx.description);
    setEditDate(tx.date);
    setEditAccountId(tx.accountId || '');
    setEditError(null);
  };

  const saveEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    if (editingTx.verified) {
      setEditError('This transaction is verified and locked. Unlock it first to make changes.');
      return;
    }

    const parsed = parseFloat(editAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setEditError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!editDescription.trim()) {
      setEditError('Please enter a description.');
      return;
    }

    const updates = {
      amount: parsed,
      category: editCategory,
      description: editDescription.trim(),
      date: editDate || new Date().toISOString().split('T')[0],
      account_id: editAccountId || null,
    };

    if (userId) {
      const { error } = await supabase.from('transactions').update(updates).eq('id', editingTx.id);
      if (error) {
        setEditError('Could not update transaction. Please try again.');
        return;
      }
      setDbTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTx.id
            ? {
                ...t,
                amount: parsed,
                category: editCategory,
                description: editDescription.trim(),
                date: updates.date,
                accountId: editAccountId || null,
              }
            : t
        )
      );
    } else {
      updateGuestTransaction(editingTx.id, {
        amount: parsed,
        category: editCategory,
        description: editDescription.trim(),
        date: updates.date,
        accountId: editAccountId || null,
      });
    }

    setEditingTx(null);
    setAccountMessage('Transaction updated. Account balances have been dynamically recalculated.');
  };

  /**
   * Balance Adjustment Handlers
   */
  const handleAdjustBalance = async (
    targetAccId: string,
    deltaAmount: number,
    adjDate: string,
    adjNote: string
  ): Promise<boolean> => {
    setAccountError(null);
    setAccountMessage(null);

    if (!targetAccId || deltaAmount === 0) {
      setAccountError('Choose an account and a non-zero adjustment amount.');
      return false;
    }

    if (!userId) {
      addGuestAdjustment({
        accountId: targetAccId,
        amount: deltaAmount,
        date: adjDate,
        note: adjNote,
        verified: false,
      });
      setAccountMessage('Balance adjustment recorded. Account balance has been updated.');
      return true;
    }

    const { data: inserted, error } = await supabase
      .from('balance_adjustments')
      .insert({
        user_id: userId,
        account_id: targetAccId,
        amount: deltaAmount,
        date: adjDate,
        note: adjNote,
        verified: false,
      })
      .select('id, account_id, amount, date, note, verified, created_at')
      .single();

    if (error || !inserted) {
      setAccountError('Could not save balance adjustment. Please try again.');
      return false;
    }

    setDbAdjustments((prev) => [rowToAdjustment(inserted), ...prev]);
    setAccountMessage('Balance adjustment recorded. Account balance has been updated.');
    return true;
  };

  const handleToggleVerifyAdjustment = async (id: string, currentlyVerified: boolean) => {
    const nextVerified = !currentlyVerified;
    if (userId) {
      const { error } = await supabase.from('balance_adjustments').update({ verified: nextVerified }).eq('id', id);
      if (error) {
        setAccountError('Could not update adjustment verification.');
        return;
      }
      setDbAdjustments((prev) => prev.map((a) => (a.id === id ? { ...a, verified: nextVerified } : a)));
    } else {
      updateGuestAdjustment(id, { verified: nextVerified });
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    const target = activeAdjustments.find((a) => a.id === id);
    if (target?.verified) {
      setAccountError('This balance adjustment is verified and locked against deletion. Unlock it first to delete.');
      return;
    }
    if (userId) {
      const { error } = await supabase.from('balance_adjustments').delete().eq('id', id).eq('verified', false);
      if (error) {
        setAccountError('Could not delete balance adjustment.');
        return;
      }
      setDbAdjustments((prev) => prev.filter((a) => a.id !== id));
    } else {
      deleteGuestAdjustment(id);
    }
    setAccountMessage('Balance adjustment deleted.');
  };

  /**
   * Transfer Verification & Deletion Handlers
   */
  const handleToggleVerifyTransfer = async (id: string, currentlyVerified: boolean) => {
    const nextVerified = !currentlyVerified;
    if (userId) {
      const { error } = await supabase.from('transfers').update({ verified: nextVerified }).eq('id', id);
      if (error) {
        setAccountError('Could not update transfer verification.');
        return;
      }
      setDbTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, verified: nextVerified } : t)));
    } else {
      updateGuestTransfer(id, { verified: nextVerified });
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    const target = activeTransfers.find((t) => t.id === id);
    if (target?.verified) {
      setAccountError('This transfer is verified and locked against deletion. Unlock it first to delete.');
      return;
    }
    if (userId) {
      const { error } = await supabase.from('transfers').delete().eq('id', id).eq('verified', false);
      if (error) {
        setAccountError('Could not delete transfer.');
        return;
      }
      setDbTransfers((prev) => prev.filter((t) => t.id !== id));
    } else {
      deleteGuestTransfer(id);
    }
    setAccountMessage('Transfer deleted.');
  };

  /**
   * Convert Transaction to Balance Adjustment (Data Cleanup Flow)
   */
  const openConvertModal = (tx: Transaction) => {
    setConvertModalTx(tx);
    setConvertTargetAccountId(tx.accountId || (activeAccounts[0]?.id ?? ''));
    // If it was an expense, delta on account was -amount. If income, +amount.
    // Allow the user to review/change the signed delta
    const defaultDelta = tx.type === 'income' ? tx.amount : -tx.amount;
    setConvertDeltaAmount(String(defaultDelta));
  };

  const executeConvertToAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertModalTx || !convertTargetAccountId) return;

    const delta = parseFloat(convertDeltaAmount);
    if (isNaN(delta) || delta === 0) {
      setAccountError('Please enter a non-zero adjustment amount.');
      return;
    }

    const note = `Converted from: ${convertModalTx.description || convertModalTx.category} (${convertModalTx.type})`;
    const success = await handleAdjustBalance(
      convertTargetAccountId,
      delta,
      convertModalTx.date,
      note
    );

    if (success) {
      await executeDeleteTransaction(convertModalTx.id);
      setConvertModalTx(null);
      setAccountMessage('Transaction successfully converted to a dedicated Balance Adjustment! Income/expense totals have been restored.');
    }
  };

  // Account Management
  const handleAddAccount = async (accName: string, accountType: AccountType) => {
    setAccountError(null);
    setAccountMessage(null);
    if (!userId) {
      addGuestAccount({ name: accName, type: accountType });
      return true;
    }
    const { data: inserted, error } = await supabase
      .from('accounts')
      .insert({ user_id: userId, name: accName, type: accountType })
      .select('id, name, type')
      .single();
    if (error || !inserted) {
      setAccountError('Could not add that account. Please try again.');
      return false;
    }
    setDbAccounts((previous) => [...previous, inserted as Account]);
    return true;
  };

  const handleRenameAccount = async (id: string, newName: string) => {
    setAccountError(null);
    setAccountMessage(null);
    if (!userId) {
      renameGuestAccount(id, newName);
      return true;
    }
    const { error } = await supabase.from('accounts').update({ name: newName }).eq('id', id);
    if (error) {
      setAccountError('Could not rename that account. Please try again.');
      return false;
    }
    setDbAccounts((previous) => previous.map((account) => (account.id === id ? { ...account, name: newName } : account)));
    return true;
  };

  const handleDeleteAccount = async (id: string) => {
    setAccountError(null);
    setAccountMessage(null);
    const hasHistory =
      activeTransactions.some((tx) => tx.accountId === id) ||
      activeTransfers.some((tr) => tr.fromAccountId === id || tr.toAccountId === id) ||
      activeAdjustments.some((adj) => adj.accountId === id);

    if (hasHistory) {
      setAccountError('This account cannot be deleted because it has linked transactions, transfers, or balance adjustments.');
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

  const handleTransfer = async (
    fromId: string,
    toId: string,
    transferAmt: number,
    transferDt: string,
    transferNt: string
  ) => {
    setAccountError(null);
    setAccountMessage(null);
    if (fromId === toId || transferAmt <= 0) {
      setAccountError('Choose two different accounts and a positive transfer amount.');
      return false;
    }
    if (!userId) {
      addGuestTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: transferAmt,
        date: transferDt,
        note: transferNt,
        verified: false,
      });
      setAccountMessage('Transfer recorded. It affects account balances only.');
      return true;
    }
    const { data: inserted, error } = await supabase
      .from('transfers')
      .insert({
        user_id: userId,
        from_account_id: fromId,
        to_account_id: toId,
        amount: transferAmt,
        date: transferDt,
        note: transferNt,
        verified: false,
      })
      .select('id, from_account_id, to_account_id, amount, date, note, verified')
      .single();

    if (error || !inserted) {
      setAccountError('Could not record the transfer. Please try again.');
      return false;
    }
    setDbTransfers((previous) => [rowToTransfer(inserted), ...previous]);
    setAccountMessage('Transfer recorded. It affects account balances only.');
    return true;
  };

  const handleClearAll = async () => {
    setAccountError(null);
    setLoadError(null);

    const verifiedCount = activeTransactions.filter((tx) => tx.verified).length;
    const unverifiedCount = activeTransactions.length - verifiedCount;

    if (unverifiedCount === 0) {
      if (verifiedCount > 0) {
        setAccountMessage(
          `No unverified records to clear. All ${verifiedCount} transaction${
            verifiedCount === 1 ? '' : 's'
          } are verified and protected.`
        );
      } else {
        setAccountMessage('No records to clear.');
      }
      return;
    }

    if (userId) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId)
        .eq('verified', false);

      if (error) {
        setLoadError('Could not clear your records. Please try again.');
        return;
      }
      setDbTransactions((prev) => prev.filter((item) => item.verified));
    } else {
      clearGuestTransactions();
    }

    if (verifiedCount > 0) {
      setAccountMessage(
        `Cleared ${unverifiedCount} unverified record${
          unverifiedCount === 1 ? '' : 's'
        }. ${verifiedCount} verified record${
          verifiedCount === 1 ? ' was' : 's were'
        } protected and kept intact.`
      );
    } else {
      setAccountMessage(
        `Cleared ${unverifiedCount} record${unverifiedCount === 1 ? '' : 's'}.`
      );
    }
  };

  // Pure cash flow aggregates (only from actual transactions, NEVER from adjustments or transfers)
  const totalIncome = calculateTotalByType(activeTransactions, 'income');
  const totalExpenses = calculateTotalByType(activeTransactions, 'expense');
  const netSurplus = calculateNetSavings(totalIncome, totalExpenses);
  const savingsRate = calculateSavingsRate(totalIncome, totalExpenses);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NP', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Filtered transactions
  const filteredTransactions = activeTransactions.filter((item) => {
    if (filterType === 'fixups') {
      if (!isPotentialFixup(item)) return false;
    } else if (filterType !== 'all' && item.type !== filterType) {
      return false;
    }

    if (filterAccount !== 'all') {
      if (filterAccount === 'unassigned') {
        if (item.accountId) return false;
      } else if (item.accountId !== filterAccount) {
        return false;
      }
    }

    const matchesSearch =
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
            <span>{accountMessage}</span>
            <button type="button" onClick={() => setAccountMessage(null)} className="text-xs font-bold ml-2 cursor-pointer">✕</button>
          </div>
        )}
        {loadingTransactions && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Loading financial data...</div>
        )}

        {/* Guest Mode Notice */}
        {!userId && authChecked && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wide shrink-0">
                Try It Out Mode
              </span>
              <span>
                Adding entries in <strong>Guest Mode</strong>. Transactions and account reconciliations live in RAM and reset on refresh.
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Income & Expense Tracking</h1>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                v1.4 Live Derived
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Log expenditures, reconcile accounts with balance adjustments, lock verified entries, and preserve clean NEPSE investment capacity.
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

        {/* Monthly Cash Flow Metrics */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              Monthly Cash Flow Breakdown
            </h2>
            <span className="text-xs text-zinc-500">
              {activeTransactions.length} total logged transactions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {/* Total Income */}
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
                Total inflows from salaries, side income, and returns
              </p>
            </div>

            {/* Total Expenses */}
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
                Rent, living costs, and Dollar Card expenditures
              </p>
            </div>

            {/* Net Surplus */}
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
        </section>

        {/* Data Cleanup Guidance Banner (Only shown when potential fix-ups are detected) */}
        {potentialFixupsCount > 0 && (
          <div className="p-4 rounded-2xl bg-sky-500/10 dark:bg-sky-950/30 border border-sky-500/30 text-sky-900 dark:text-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <strong>Review Past Balance Fix-up Entries ({potentialFixupsCount} found):</strong>
              </div>
              <p className="text-xs text-sky-800 dark:text-sky-300">
                You have logged entries that appear to be manual balance fixes (e.g. negative cash transactions). These distort your monthly income/expense totals. Use the &quot;Potential Fix-ups&quot; tab below to review them and convert them into clean <strong>Balance Adjustments</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFilterType('fixups')}
              className="px-3.5 py-1.5 font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs transition self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
            >
              Review Fix-ups ({potentialFixupsCount})
            </button>
          </div>
        )}

        {/* Accounts & Balance Adjustments Manager */}
        <AccountsManager
          accounts={activeAccounts}
          balances={accountBalances}
          transfers={activeTransfers}
          adjustments={activeAdjustments}
          onAdd={handleAddAccount}
          onRename={handleRenameAccount}
          onDelete={handleDeleteAccount}
          onTransfer={handleTransfer}
          onAdjustBalance={handleAdjustBalance}
          onToggleVerifyTransfer={handleToggleVerifyTransfer}
          onToggleVerifyAdjustment={handleToggleVerifyAdjustment}
          onDeleteTransfer={handleDeleteTransfer}
          onDeleteAdjustment={handleDeleteAdjustment}
        />

        {/* Transaction Input Form & Logged List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Form */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Add Transaction {!userId && <span className="text-xs font-normal text-amber-600 dark:text-amber-400">(Guest Mode)</span>}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Record an income stream or daily expenditure. Link to an account for dynamic balance derivation.
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
                  {isDollarCardExpense ? 'Amount (USD) *' : 'Amount (in NPR / Rs.) *'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 font-semibold text-sm">
                    {isDollarCardExpense ? 'USD' : 'Rs.'}
                  </div>
                  <input
                    id="amount"
                    type="number"
                    step="any"
                    min="0"
                    placeholder={isDollarCardExpense ? 'e.g. 12.99' : 'e.g. 5000'}
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

              {isDollarCardExpense && (
                <div className={`rounded-xl border p-3 text-xs ${fxRate?.stale ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100' : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100'}`}>
                  {fxLoading ? (
                    <p>Loading the official NRB USD rate…</p>
                  ) : fxRate?.success && fxRate.sell ? (
                    <p><strong>{fxRate.stale ? 'Possibly stale NRB fallback:' : 'Current NRB sell rate:'}</strong> 1 USD ≈ Rs. {formatCurrency(fxRate.sell)}{fxRate.asOf ? `, rate date ${fxRate.asOf}` : ''}. {fxRate.stale ? 'This is the last successfully fetched rate.' : 'Used for Dollar Card spending.'}</p>
                  ) : (
                    <div className="space-y-2">
                      <p><strong>NRB rate unavailable:</strong> {fxRate?.error ?? 'No rate could be loaded.'} Enter the manual rate below.</p>
                      <label className="block font-semibold">
                        Manual NPR per USD
                        <input
                          type="number"
                          min="0.000001"
                          step="0.000001"
                          value={manualUsdRate}
                          onChange={(event) => setManualUsdRate(event.target.value)}
                          placeholder="e.g. 140.25"
                          className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-amber-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </label>
                    </div>
                  )}
                  {amount && !fxLoading && ((fxRate?.success && fxRate.sell) || Number(manualUsdRate) > 0) && (
                    <p className="mt-2 font-semibold">
                      Converted NPR total: Rs. {formatCurrency(Number(amount) * (fxRate?.success && fxRate.sell ? fxRate.sell : Number(manualUsdRate)))}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
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

              {/* Date */}
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

              {/* Account selection */}
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
                    <option key={account.id} value={account.id}>
                      {account.name} (Rs. {formatCurrency(accountBalances[account.id] ?? 0)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-400'
                    : 'bg-rose-600 hover:bg-rose-500 focus:ring-2 focus:ring-rose-400'
                }`}
              >
                {submitting ? 'Saving...' : `+ Add ${type === 'income' ? 'Income' : 'Expense'} Entry`}
              </button>
            </form>
          </div>

          {/* Logged Transactions Table */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
            {/* Table Header Controls */}
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
                          totalItems !== activeTransactions.length ? ` (filtered from ${activeTransactions.length})` : ''
                        }`}
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-medium self-start sm:self-auto gap-1">
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
                  {potentialFixupsCount > 0 && (
                    <button
                      onClick={() => setFilterType('fixups')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        filterType === 'fixups'
                          ? 'bg-sky-600 text-white font-semibold shadow-xs'
                          : 'text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-950/40'
                      }`}
                    >
                      Fix-ups ({potentialFixupsCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Row: Account Selector + Search */}
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2">
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Accounts</option>
                  <option value="unassigned">Unassigned (No Account)</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search transactions by description or category..."
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
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 text-xs font-medium border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th scope="col" className="py-3 px-3 sm:px-4">Date</th>
                      <th scope="col" className="py-3 px-3 sm:px-4">Description</th>
                      <th scope="col" className="py-3 px-3 sm:px-4">Account / Cat</th>
                      <th scope="col" className="py-3 px-3 sm:px-4 text-right">Amount</th>
                      <th scope="col" className="py-3 px-3 sm:px-4 text-center">Status</th>
                      <th scope="col" className="py-3 px-3 sm:px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                    {paginatedTransactions.map((item) => {
                      const isIncome = item.type === 'income';
                      const account = activeAccounts.find((a) => a.id === item.accountId);
                      const isVerified = Boolean(item.verified);
                      const isFixup = isPotentialFixup(item);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors ${
                            isFixup && filterType === 'fixups' ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''
                          }`}
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
                            {isFixup && (
                              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold block">
                                💡 Potential Fix-up entry
                              </span>
                            )}
                          </td>

                          {/* Account & Category */}
                          <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  isIncome
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                                }`}
                              >
                                {item.category}
                              </span>
                            </div>
                            {account ? (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                                🏦 {account.name}
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-400 italic">No account</div>
                            )}
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
                              {item.originalCurrency === 'USD' && item.originalAmount && item.exchangeRate ? (
                                <>
                                  <span>− USD {formatCurrency(item.originalAmount)}</span>
                                  <span className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                    ≈ Rs. {formatCurrency(item.amount)} @ {formatCurrency(item.exchangeRate)}
                                    {item.exchangeRateStatus === 'stale'
                                      ? ' (stale)'
                                      : item.exchangeRateStatus === 'manual'
                                      ? ' (manual)'
                                      : ''}
                                  </span>
                                </>
                              ) : (
                                <>{isIncome ? '+' : '−'} Rs. {formatCurrency(item.amount)}</>
                              )}
                            </span>
                          </td>

                          {/* Verification Status */}
                          <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                            {isVerified ? (
                              <span
                                title="Verified against statement (Locked against accidental changes)"
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs"
                              >
                                🔒 Verified
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleVerifyTransaction(item)}
                                className="text-xs text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer underline"
                              >
                                Mark Verified
                              </button>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                title={isVerified ? 'View locked transaction details' : 'Edit transaction'}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>

                              {/* Unlock Button for Verified */}
                              {isVerified && (
                                <button
                                  type="button"
                                  onClick={() => setUnlockModalTx(item)}
                                  title="Unlock verified transaction"
                                  className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer text-xs font-semibold"
                                >
                                  Unlock
                                </button>
                              )}

                              {/* Convert to Balance Adjustment Button */}
                              {isFixup && (
                                <button
                                  type="button"
                                  onClick={() => openConvertModal(item)}
                                  title="Convert to dedicated Balance Adjustment"
                                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 hover:bg-sky-200 cursor-pointer shadow-2xs"
                                >
                                  ⚖️ Convert
                                </button>
                              )}

                              {/* Delete Button (Only for Unverified) */}
                              {!isVerified && (
                                <button
                                  type="button"
                                  onClick={() => executeDeleteTransaction(item.id)}
                                  title="Delete transaction"
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
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

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          pageNum === effectivePage
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
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
                  <strong
                    className={
                      calculateNetSavings(
                        calculateTotalByType(filteredTransactions, 'income'),
                        calculateTotalByType(filteredTransactions, 'expense')
                      ) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }
                  >
                    Rs.{' '}
                    {formatCurrency(
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

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {editingTx.verified ? 'Locked Transaction Details' : 'Edit Transaction'}
                </h3>
                {editingTx.verified && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300">
                    🔒 Locked
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editingTx.verified && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p>
                  🔒 <strong>This transaction is verified</strong> against statements. Its amount, category, account, and date are read-only to prevent accidental corruption of your records.
                </p>
                <button
                  type="button"
                  onClick={() => setUnlockModalTx(editingTx)}
                  className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-500 cursor-pointer"
                >
                  Unlock this Transaction to Edit
                </button>
              </div>
            )}

            {editError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
                {editError}
              </div>
            )}

            <form onSubmit={saveEditTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Amount (NPR) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  disabled={editingTx.verified}
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Category *
                </label>
                <select
                  disabled={editingTx.verified}
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
                >
                  {(editingTx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description / Note *
                </label>
                <input
                  type="text"
                  disabled={editingTx.verified}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  disabled={editingTx.verified}
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Linked Account
                </label>
                <select
                  disabled={editingTx.verified}
                  value={editAccountId}
                  onChange={(e) => setEditAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
                >
                  <option value="">No account selected</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} (Rs. {formatCurrency(accountBalances[account.id] ?? 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Close
                </button>
                {!editingTx.verified && (
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer shadow-xs"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlock Confirmation Modal */}
      {unlockModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <span className="text-lg">⚠️</span>
              <span>Unlock Verified Transaction?</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              This transaction is verified — unlocking it will allow changes that affect your totals. Continue?
            </p>
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-300 space-y-0.5">
              <div><strong>{unlockModalTx.description}</strong></div>
              <div>{unlockModalTx.date} · Rs. {formatCurrency(unlockModalTx.amount)}</div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUnlockModalTx(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Keep Locked
              </button>
              <button
                type="button"
                onClick={confirmUnlockTransaction}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-500 cursor-pointer"
              >
                Yes, Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Balance Adjustment Modal (Data Cleanup Flow) */}
      {convertModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Convert to Balance Adjustment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConvertModalTx(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Converting this transaction will <strong>remove it from your income/expenses</strong> and recreate it as a dedicated <strong>Balance Adjustment</strong> on the chosen account. This cleans your monthly savings rate and cash flow metrics.
            </p>

            <form onSubmit={executeConvertToAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Target Account *
                </label>
                <select
                  required
                  value={convertTargetAccountId}
                  onChange={(e) => setConvertTargetAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select account to adjust</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Current: Rs. {formatCurrency(accountBalances[acc.id] ?? 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Signed Balance Correction Amount (NPR) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={convertDeltaAmount}
                  onChange={(e) => setConvertDeltaAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 font-mono"
                />
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Positive numbers increase the account balance; negative numbers decrease it.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConvertModalTx(null)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!convertTargetAccountId}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Confirm Conversion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
