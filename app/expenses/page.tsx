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
  formatNepaliNumber,
} from '@/lib/calculations/finance';
import { supabase } from '@/lib/supabase';
import { useGuestMode } from '@/context/GuestModeContext';
import { AccountsManager } from '@/components/AccountsManager';
import { LedgerRow } from '@/components/LedgerRow';

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
  // Dollar Card FX applies the same way whether the entry is income (e.g. a USD
  // payment received) or an expense (USD spending) — currency is a property of
  // the account, not the transaction direction.
  const isDollarCardTx = selectedAccount?.type === 'dollar_card';

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
    if (!isDollarCardTx) return;
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
  }, [isDollarCardTx]);

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

    if (isDollarCardTx && !effectiveUsdRate) {
      setFormError('The NRB rate is unavailable. Enter a positive manual NPR-per-USD rate to log this Dollar Card expense.');
      return;
    }

    const parsedAmount = isDollarCardTx && effectiveUsdRate ? Number((enteredAmount * effectiveUsdRate).toFixed(2)) : enteredAmount;
    const exchangeRateStatus = isDollarCardTx ? (hasLiveRate ? 'live' : hasStaleRate ? 'stale' : 'manual') : null;
    const exchangeRateDate = isDollarCardTx ? (hasLiveRate || hasStaleRate ? fxRate?.asOf ?? txDate : txDate) : null;

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
          original_amount: isDollarCardTx ? enteredAmount : null,
          original_currency: isDollarCardTx ? 'USD' : null,
          exchange_rate: isDollarCardTx ? effectiveUsdRate : null,
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
        originalAmount: isDollarCardTx ? enteredAmount : null,
        originalCurrency: isDollarCardTx ? 'USD' : null,
        exchangeRate: isDollarCardTx ? effectiveUsdRate : null,
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

  const formatCurrency = formatNepaliNumber;

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
    <main className="page bound">
      <span className="binding-label">FY 2083/84</span>
      <div className="space-y-6">
        {/* Masthead */}
        <header className="masthead">
          <div>
            <h1>Income &amp; expenses</h1>
            <p className="masthead-note">
              Write an entry, reconcile account balances against a statement, and record Dollar
              Card spending at the NRB rate.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="stamp">
              {activeTransactions.length}
              <span className="hair" aria-hidden="true" />
              {activeTransactions.length === 1 ? 'entry' : 'entries'}
            </span>
            <Link href="/" className="btn btn-sm">
              Overview
            </Link>
          </div>
        </header>

        {loadError && <div className="note note-loss">{loadError}</div>}
        {accountError && <div className="note note-loss">{accountError}</div>}
        {accountMessage && (
          <div className="note note-gain">
            <span>{accountMessage}</span>
            <button
              type="button"
              onClick={() => setAccountMessage(null)}
              className="link-ink text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}
        {loadingTransactions && <p className="fig fig-sm fig-mute">Reading the book&hellip;</p>}

        {/* Guest Mode Notice */}
        {!userId && authChecked && (
          <div className="note note-warn">
            <span>
              This is a <strong>scratch page</strong>. Entries, transfers and reconciliations stay
              in memory and are gone when you reload.
            </span>
            <Link href="/login" className="btn btn-warn btn-sm">
              Sign in to keep them
            </Link>
          </div>
        )}

        {/* Monthly cash flow */}
        <section className="sheet">
          <div className="sheet-hd">
            <h2 className="sheet-title">
              Cash flow this month
            </h2>
            <span className="sheet-sub">{activeTransactions.length} recorded entries</span>
          </div>
          <div className="sheet-bd">
            <div className="ledger">
              <LedgerRow
                label="Income"
                amount={totalIncome}
                unit="Rs"
                tone="gain"
                tag={`${activeTransactions.filter((t) => t.type === 'income').length} sources`}
                note="Salary, side work, freelance and returns."
              />
              <LedgerRow
                label="Expenses"
                amount={totalExpenses}
                unit="Rs"
                tone="loss"
                tag={`${activeTransactions.filter((t) => t.type === 'expense').length} logged`}
                note="Rent, living costs, bills and Dollar Card FX."
              />
              <LedgerRow
                label="Net investable surplus"
                amount={netSurplus}
                unit="Rs"
                tone={netSurplus >= 0 ? 'gain' : 'loss'}
                total
                large
                note={`${savingsRate}% savings rate. Unallocated capital, ready for NEPSE.`}
              />
            </div>
          </div>
        </section>

        {/* Data Cleanup Guidance Banner (Only shown when potential fix-ups are detected) */}
        {potentialFixupsCount > 0 && (
          <div className="note note-warn">
            <span>
              <strong>{potentialFixupsCount} past entries look like balance fix-ups</strong> —
              manual corrections such as negative cash transactions that distort your monthly
              income/expense totals. Use the &quot;Fix-ups&quot; tab below to convert them into
              dedicated balance adjustments.
            </span>
            <button type="button" onClick={() => setFilterType('fixups')} className="btn btn-warn btn-sm">
              Review fix-ups ({potentialFixupsCount})
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Form */}
          <div className="sheet lg:col-span-5">
            <div className="sheet-hd">
              <div>
                <h2 className="sheet-title">Write an entry</h2>
                <p className="sheet-sub">
                  {!userId && 'Guest mode. '}
                  Link it to an account for a live balance.
                </p>
              </div>
            </div>
            <div className="sheet-bd">
              {formError && <div className="note note-loss mb-4">{formError}</div>}

              <form onSubmit={handleAddTransaction} className="space-y-4">
                {/* Type Switcher */}
                <div className="seg" role="group" aria-label="Transaction type">
                  <button
                    type="button"
                    aria-pressed={type === 'income'}
                    onClick={() => handleTypeChange('income')}
                    className="flex-1"
                  >
                    + Income
                  </button>
                  <button
                    type="button"
                    aria-pressed={type === 'expense'}
                    onClick={() => handleTypeChange('expense')}
                    className="flex-1"
                  >
                    &minus; Expense
                  </button>
                </div>

                {/* Account selection — first, so choosing a Dollar Card account
                    immediately switches the Amount field below to ask for USD,
                    instead of silently reinterpreting a number already typed. */}
                <div>
                  <label htmlFor="account" className="field-lbl">
                    Account <span className="text-ink-faint">(optional)</span>
                  </label>
                  <select
                    id="account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="field"
                  >
                    <option value="">No account selected</option>
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} (Rs {formatCurrency(accountBalances[account.id] ?? 0)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount Field */}
                <div>
                  <label htmlFor="amount" className="field-lbl">
                    {isDollarCardTx ? 'Amount (USD)' : 'Amount (NPR)'}
                  </label>
                  <div className="field-wrap">
                    <span className="prefix">{isDollarCardTx ? 'USD' : 'Rs'}</span>
                    <input
                      id="amount"
                      type="number"
                      step="any"
                      min="0"
                      placeholder={isDollarCardTx ? 'e.g. 12.99' : 'e.g. 5000'}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="field field-num"
                    />
                  </div>
                </div>

                {isDollarCardTx && (
                  <div className={`note ${fxRate?.stale ? 'note-warn' : ''}`}>
                    {fxLoading ? (
                      <span>Loading the official NRB USD rate&hellip;</span>
                    ) : fxRate?.success && fxRate.sell ? (
                      <span>
                        <strong>{fxRate.stale ? 'Possibly stale NRB fallback: ' : 'Current NRB sell rate: '}</strong>
                        1 USD &asymp; Rs {formatCurrency(fxRate.sell)}
                        {fxRate.asOf ? `, rate date ${fxRate.asOf}` : ''}.{' '}
                        {fxRate.stale ? 'This is the last successfully fetched rate.' : `Used for this Dollar Card ${type === 'income' ? 'deposit' : 'expense'}.`}
                      </span>
                    ) : (
                      <div className="w-full space-y-2">
                        <p>
                          <strong>NRB rate unavailable: </strong>
                          {fxRate?.error ?? 'No rate could be loaded.'} Enter the manual rate below.
                        </p>
                        <div>
                          <label className="field-lbl">Manual NPR per USD</label>
                          <input
                            type="number"
                            min="0.000001"
                            step="0.000001"
                            value={manualUsdRate}
                            onChange={(event) => setManualUsdRate(event.target.value)}
                            placeholder="e.g. 140.25"
                            className="field field-num"
                          />
                        </div>
                      </div>
                    )}
                    {amount && !fxLoading && ((fxRate?.success && fxRate.sell) || Number(manualUsdRate) > 0) && (
                      <p className="w-full mt-1 fig fig-sm">
                        Converted total: Rs {formatCurrency(Number(amount) * (fxRate?.success && fxRate.sell ? fxRate.sell : Number(manualUsdRate)))}
                      </p>
                    )}
                  </div>
                )}

                {/* Category Field */}
                <div>
                  <label htmlFor="category" className="field-lbl">
                    Category
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="field"
                  >
                    {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="field-lbl">
                    Description
                  </label>
                  <input
                    id="description"
                    type="text"
                    placeholder={type === 'income' ? 'e.g. Monthly salary from company' : 'e.g. Groceries at Bhatbhateni'}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="field"
                  />
                </div>

                {/* Date */}
                <div>
                  <label htmlFor="date" className="field-lbl">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="field"
                  />
                </div>

                <button type="submit" disabled={submitting} className="btn btn-ink btn-block">
                  {submitting ? 'Saving…' : `Add ${type === 'income' ? 'income' : 'expense'} entry`}
                </button>
              </form>
            </div>
          </div>

          {/* Logged Transactions Table */}
          <div className="sheet lg:col-span-7">
            {/* Table Header Controls */}
            <div className="sheet-hd flex-col items-stretch gap-3 sm:flex-col sm:items-stretch">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="sheet-title">Logged transactions</h2>
                  <p className="sheet-sub">
                    {totalItems === 0
                      ? '0 records'
                      : `Showing ${startIndex + 1}–${endIndex} of ${totalItems} records${
                          totalItems !== activeTransactions.length ? ` (filtered from ${activeTransactions.length})` : ''
                        }`}
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="seg self-start sm:self-auto">
                  <button type="button" aria-pressed={filterType === 'all'} onClick={() => setFilterType('all')}>
                    All ({activeTransactions.length})
                  </button>
                  <button type="button" aria-pressed={filterType === 'income'} onClick={() => setFilterType('income')}>
                    Income ({activeTransactions.filter((t) => t.type === 'income').length})
                  </button>
                  <button type="button" aria-pressed={filterType === 'expense'} onClick={() => setFilterType('expense')}>
                    Expenses ({activeTransactions.filter((t) => t.type === 'expense').length})
                  </button>
                  {potentialFixupsCount > 0 && (
                    <button type="button" aria-pressed={filterType === 'fixups'} onClick={() => setFilterType('fixups')}>
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
                  className="field"
                >
                  <option value="all">All accounts</option>
                  <option value="unassigned">Unassigned (no account)</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search by description or category&hellip;"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="field"
                />
              </div>
            </div>

            {/* Table */}
            {filteredTransactions.length === 0 ? (
              <div className="empty m-3.5">
                <p className="empty-mark">&mdash;</p>
                <h3 className="empty-title">No transactions found</h3>
                <p className="empty-body">
                  {activeTransactions.length === 0
                    ? 'Use the form to write your first income or expense entry.'
                    : 'No records match this filter.'}
                </p>
              </div>
            ) : (
              <div className="scroll-x">
                <table className="floor min-w-[620px]">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Description</th>
                      <th scope="col">Account / category</th>
                      <th scope="col" className="text-right">Amount</th>
                      <th scope="col" className="text-center">Status</th>
                      <th scope="col" className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((item) => {
                      const isIncome = item.type === 'income';
                      const account = activeAccounts.find((a) => a.id === item.accountId);
                      const isVerified = Boolean(item.verified);
                      const isFixup = isPotentialFixup(item);

                      return (
                        <tr key={item.id} className={isFixup && filterType === 'fixups' ? 'bg-sayapatri-wash/40' : undefined}>
                          {/* Date */}
                          <td className="fig fig-sm whitespace-nowrap">{item.date}</td>

                          {/* Description */}
                          <td>
                            <div className="max-w-[160px] truncate text-xs font-medium text-ink sm:max-w-none sm:text-[13px]">
                              {item.description}
                            </div>
                            {isFixup && <span className="tag tag-warn mt-1">Possible fix-up</span>}
                          </td>

                          {/* Account & Category */}
                          <td className="whitespace-nowrap">
                            <span className={`tag ${isIncome ? 'tag-gain' : ''}`}>{item.category}</span>
                            {account ? (
                              <div className="mt-1 fig fig-sm fig-mute">{account.name}</div>
                            ) : (
                              <div className="mt-1 text-[11px] italic text-ink-faint">No account</div>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="num">
                            {item.originalCurrency === 'USD' && item.originalAmount && item.exchangeRate ? (
                              <>
                                <span className={`fig fig-md ${isIncome ? 'fig-gain' : 'fig-loss'}`}>
                                  {isIncome ? '+' : '−'} <span className="unit">USD</span>
                                  {formatCurrency(item.originalAmount)}
                                </span>
                                <span className="block fig fig-sm fig-mute">
                                  &asymp; Rs {formatCurrency(item.amount)} @ {formatCurrency(item.exchangeRate)}
                                  {item.exchangeRateStatus === 'stale'
                                    ? ' (stale)'
                                    : item.exchangeRateStatus === 'manual'
                                    ? ' (manual)'
                                    : ''}
                                </span>
                              </>
                            ) : (
                              <span className={`fig fig-md ${isIncome ? 'fig-gain' : 'fig-loss'}`}>
                                {isIncome ? '+' : '−'} <span className="unit">Rs</span>
                                {formatCurrency(item.amount)}
                              </span>
                            )}
                          </td>

                          {/* Verification Status */}
                          <td className="text-center whitespace-nowrap">
                            {isVerified ? (
                              <span title="Verified against statement, locked against accidental changes" className="tag tag-gain">
                                Verified
                              </span>
                            ) : (
                              <button type="button" onClick={() => handleToggleVerifyTransaction(item)} className="link-ink text-xs">
                                Mark verified
                              </button>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2.5">
                              <button type="button" onClick={() => openEditModal(item)} className="link-ink text-xs">
                                {isVerified ? 'View' : 'Edit'}
                              </button>

                              {isVerified && (
                                <button
                                  type="button"
                                  onClick={() => setUnlockModalTx(item)}
                                  className="text-xs font-medium text-sayapatri hover:underline"
                                >
                                  Unlock
                                </button>
                              )}

                              {isFixup && (
                                <button
                                  type="button"
                                  onClick={() => openConvertModal(item)}
                                  className="text-xs font-medium text-sayapatri hover:underline"
                                >
                                  Convert
                                </button>
                              )}

                              {!isVerified && (
                                <button
                                  type="button"
                                  onClick={() => executeDeleteTransaction(item.id)}
                                  className="text-xs font-medium text-loss hover:underline"
                                >
                                  Delete
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
              <div className="sheet-ft flex flex-col items-center justify-between gap-3 sm:flex-row">
                <div className="fig fig-sm fig-mute">
                  Page {effectivePage} of {totalPages}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={effectivePage <= 1}
                    className="btn btn-sm"
                  >
                    Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`btn btn-sm ${pageNum === effectivePage ? 'btn-ink' : ''}`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={effectivePage >= totalPages}
                    className="btn btn-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Table Footer */}
            {filteredTransactions.length > 0 && (
              <div className="sheet-ft flex flex-wrap items-center justify-between gap-3">
                <span>
                  Net for selected list:{' '}
                  <span
                    className={`fig fig-sm ${
                      calculateNetSavings(
                        calculateTotalByType(filteredTransactions, 'income'),
                        calculateTotalByType(filteredTransactions, 'expense')
                      ) >= 0
                        ? 'fig-gain'
                        : 'fig-loss'
                    }`}
                  >
                    Rs{' '}
                    {formatCurrency(
                      calculateNetSavings(
                        calculateTotalByType(filteredTransactions, 'income'),
                        calculateTotalByType(filteredTransactions, 'expense')
                      )
                    )}
                  </span>
                </span>
                <button onClick={handleClearAll} className="link-ink text-xs">
                  Clear all records
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="scrim">
          <div className="dialog">
            <div className="dialog-hd">
              <div className="flex items-center gap-2">
                <h3>{editingTx.verified ? 'Locked transaction' : 'Edit transaction'}</h3>
                {editingTx.verified && <span className="tag tag-warn">Locked</span>}
              </div>
              <button type="button" onClick={() => setEditingTx(null)} className="link-ink text-xs">
                Close
              </button>
            </div>

            <div className="dialog-bd space-y-4">
              {editingTx.verified && (
                <div className="note note-warn">
                  <span>
                    <strong>This transaction is verified</strong> against a statement. Its amount,
                    category, account, and date are read-only until unlocked.
                  </span>
                  <button type="button" onClick={() => setUnlockModalTx(editingTx)} className="btn btn-warn btn-sm">
                    Unlock to edit
                  </button>
                </div>
              )}

              {editError && <div className="note note-loss">{editError}</div>}

              <form id="edit-tx-form" onSubmit={saveEditTransaction} className="space-y-4">
                <div>
                  <label className="field-lbl">Amount (NPR)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    disabled={editingTx.verified}
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="field field-num"
                    required
                  />
                </div>

                <div>
                  <label className="field-lbl">Category</label>
                  <select
                    disabled={editingTx.verified}
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="field"
                  >
                    {(editingTx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-lbl">Description</label>
                  <input
                    type="text"
                    disabled={editingTx.verified}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="field"
                    required
                  />
                </div>

                <div>
                  <label className="field-lbl">Date</label>
                  <input
                    type="date"
                    disabled={editingTx.verified}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="field"
                  />
                </div>

                <div>
                  <label className="field-lbl">Linked account</label>
                  <select
                    disabled={editingTx.verified}
                    value={editAccountId}
                    onChange={(e) => setEditAccountId(e.target.value)}
                    className="field"
                  >
                    <option value="">No account selected</option>
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} (Rs {formatCurrency(accountBalances[account.id] ?? 0)})
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </div>
            <div className="dialog-ft">
              <button type="button" onClick={() => setEditingTx(null)} className="btn btn-sm">
                Close
              </button>
              {!editingTx.verified && (
                <button type="submit" form="edit-tx-form" className="btn btn-ink btn-sm">
                  Save changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unlock Confirmation Modal */}
      {unlockModalTx && (
        <div className="scrim">
          <div className="dialog max-w-sm">
            <div className="dialog-hd">
              <h3>Unlock verified transaction?</h3>
            </div>
            <div className="dialog-bd space-y-3">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                This transaction is verified against a statement. Unlocking it will allow changes
                that affect your totals.
              </p>
              <div className="border border-rule bg-sheet-alt p-2.5">
                <p className="text-[13px] font-medium text-ink">{unlockModalTx.description}</p>
                <p className="fig fig-sm fig-mute mt-0.5">
                  {unlockModalTx.date} &middot; Rs {formatCurrency(unlockModalTx.amount)}
                </p>
              </div>
            </div>
            <div className="dialog-ft">
              <button type="button" onClick={() => setUnlockModalTx(null)} className="btn btn-sm">
                Keep locked
              </button>
              <button type="button" onClick={confirmUnlockTransaction} className="btn btn-warn btn-sm">
                Yes, unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Balance Adjustment Modal (Data Cleanup Flow) */}
      {convertModalTx && (
        <div className="scrim">
          <div className="dialog">
            <div className="dialog-hd">
              <h3>Convert to balance adjustment</h3>
              <button type="button" onClick={() => setConvertModalTx(null)} className="link-ink text-xs">
                Close
              </button>
            </div>

            <div className="dialog-bd space-y-4">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Converting this transaction will remove it from your income/expenses and recreate
                it as a dedicated balance adjustment on the chosen account. This restores your
                monthly savings rate and cash flow figures.
              </p>

              <form id="convert-tx-form" onSubmit={executeConvertToAdjustment} className="space-y-4">
                <div>
                  <label className="field-lbl">Target account</label>
                  <select
                    required
                    value={convertTargetAccountId}
                    onChange={(e) => setConvertTargetAccountId(e.target.value)}
                    className="field"
                  >
                    <option value="">Select account to adjust</option>
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (current: Rs {formatCurrency(accountBalances[acc.id] ?? 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-lbl">Signed balance correction (NPR)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={convertDeltaAmount}
                    onChange={(e) => setConvertDeltaAmount(e.target.value)}
                    className="field field-num"
                  />
                  <p className="field-hint">Positive increases the account balance; negative decreases it.</p>
                </div>
              </form>
            </div>
            <div className="dialog-ft">
              <button type="button" onClick={() => setConvertModalTx(null)} className="btn btn-sm">
                Cancel
              </button>
              <button type="submit" form="convert-tx-form" disabled={!convertTargetAccountId} className="btn btn-warn btn-sm">
                Confirm conversion
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
