'use client';

import React, { useState } from 'react';
import { Account, AccountTransfer, AccountType, BalanceAdjustment } from '@/types';

const ACCOUNT_TYPES: Array<{ value: AccountType; label: string }> = [
  { value: 'bank', label: 'Bank' },
  { value: 'wallet', label: 'Mobile wallet' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'dollar_card', label: 'Dollar Card' },
  { value: 'other', label: 'Other' },
];

const STARTER_ACCOUNTS: Array<Omit<Account, 'id'>> = [
  { name: 'NIC Asia Bank', type: 'bank' },
  { name: 'Global IME Bank', type: 'bank' },
  { name: 'Siddhartha Bank', type: 'bank' },
  { name: 'eSewa', type: 'wallet' },
  { name: 'Khalti', type: 'wallet' },
  { name: 'Cash', type: 'cash' },
];

interface AccountsManagerProps {
  accounts: Account[];
  balances: Record<string, number>;
  transfers?: AccountTransfer[];
  adjustments?: BalanceAdjustment[];
  onAdd: (name: string, type: AccountType) => Promise<boolean>;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onTransfer: (fromAccountId: string, toAccountId: string, amount: number, date: string, note: string) => Promise<boolean>;
  onAdjustBalance?: (accountId: string, amount: number, date: string, note: string) => Promise<boolean>;
  onToggleVerifyTransfer?: (id: string, currentlyVerified: boolean) => Promise<boolean | void>;
  onToggleVerifyAdjustment?: (id: string, currentlyVerified: boolean) => Promise<boolean | void>;
  onDeleteTransfer?: (id: string, isVerified: boolean) => Promise<boolean | void>;
  onDeleteAdjustment?: (id: string, isVerified: boolean) => Promise<boolean | void>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-NP', { maximumFractionDigits: 2 }).format(value);

export function AccountsManager({
  accounts,
  balances,
  transfers = [],
  adjustments = [],
  onAdd,
  onRename,
  onDelete,
  onTransfer,
  onAdjustBalance,
  onToggleVerifyTransfer,
  onToggleVerifyAdjustment,
  onDeleteTransfer,
  onDeleteAdjustment,
}: AccountsManagerProps) {
  // Account creation & renaming state
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Transfer form state
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [transferNote, setTransferNote] = useState('');

  // Balance adjustment modal state
  const [adjustingAccount, setAdjustingAccount] = useState<Account | null>(null);
  const [adjMode, setAdjMode] = useState<'target' | 'delta'>('target');
  const [targetBalanceInput, setTargetBalanceInput] = useState('');
  const [deltaAmountInput, setDeltaAmountInput] = useState('');
  const [adjDate, setAdjDate] = useState(new Date().toISOString().slice(0, 10));
  const [adjNote, setAdjNote] = useState('');
  const [adjError, setAdjError] = useState<string | null>(null);

  // History views and unlock confirmation modal
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'transfers' | 'adjustments'>('adjustments');
  const [unlockConfirmItem, setUnlockConfirmItem] = useState<{
    type: 'transfer' | 'adjustment';
    id: string;
    description: string;
  } | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    type: 'transfer' | 'adjustment';
    id: string;
    isVerified: boolean;
    description: string;
  } | null>(null);

  const [busy, setBusy] = useState(false);

  const addAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    if (await onAdd(name.trim(), type)) setName('');
    setBusy(false);
  };

  const addSuggestions = async () => {
    setBusy(true);
    for (const suggested of STARTER_ACCOUNTS) await onAdd(suggested.name, suggested.type);
    setBusy(false);
  };

  const submitRename = async (id: string) => {
    if (!editingName.trim()) return;
    setBusy(true);
    if (await onRename(id, editingName.trim())) {
      setEditingId(null);
      setEditingName('');
    }
    setBusy(false);
  };

  const submitTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(transferAmount);
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId || !amount || amount <= 0) return;
    setBusy(true);
    if (await onTransfer(fromAccountId, toAccountId, amount, transferDate, transferNote.trim())) {
      setTransferAmount('');
      setTransferNote('');
    }
    setBusy(false);
  };

  const openAdjustModal = (account: Account) => {
    setAdjustingAccount(account);
    const currentBalance = balances[account.id] ?? 0;
    setTargetBalanceInput(String(currentBalance));
    setDeltaAmountInput('');
    setAdjMode('target');
    setAdjDate(new Date().toISOString().slice(0, 10));
    setAdjNote('');
    setAdjError(null);
  };

  const closeAdjustModal = () => {
    setAdjustingAccount(null);
    setAdjError(null);
  };

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustingAccount || !onAdjustBalance) return;

    const currentBalance = balances[adjustingAccount.id] ?? 0;
    let finalDelta = 0;

    if (adjMode === 'target') {
      const target = parseFloat(targetBalanceInput);
      if (isNaN(target)) {
        setAdjError('Please enter a valid target balance.');
        return;
      }
      finalDelta = Number((target - currentBalance).toFixed(2));
    } else {
      const delta = parseFloat(deltaAmountInput);
      if (isNaN(delta) || delta === 0) {
        setAdjError('Please enter a non-zero adjustment amount.');
        return;
      }
      finalDelta = Number(delta.toFixed(2));
    }

    if (finalDelta === 0) {
      setAdjError('The resulting balance adjustment is Rs. 0. Enter an amount that changes the balance.');
      return;
    }

    setBusy(true);
    const success = await onAdjustBalance(
      adjustingAccount.id,
      finalDelta,
      adjDate || new Date().toISOString().slice(0, 10),
      adjNote.trim()
    );
    setBusy(false);

    if (success) {
      closeAdjustModal();
    }
  };

  const handleConfirmUnlock = async () => {
    if (!unlockConfirmItem) return;
    setBusy(true);
    if (unlockConfirmItem.type === 'transfer' && onToggleVerifyTransfer) {
      await onToggleVerifyTransfer(unlockConfirmItem.id, true);
    } else if (unlockConfirmItem.type === 'adjustment' && onToggleVerifyAdjustment) {
      await onToggleVerifyAdjustment(unlockConfirmItem.id, true);
    }
    setBusy(false);
    setUnlockConfirmItem(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem || deleteConfirmItem.isVerified) return;
    setBusy(true);
    if (deleteConfirmItem.type === 'transfer' && onDeleteTransfer) {
      await onDeleteTransfer(deleteConfirmItem.id, deleteConfirmItem.isVerified);
    } else if (deleteConfirmItem.type === 'adjustment' && onDeleteAdjustment) {
      await onDeleteAdjustment(deleteConfirmItem.id, deleteConfirmItem.isVerified);
    }
    setBusy(false);
    setDeleteConfirmItem(null);
  };

  const currentAdjustingBalance = adjustingAccount ? (balances[adjustingAccount.id] ?? 0) : 0;
  const computedDeltaFromTarget = adjMode === 'target' && targetBalanceInput !== '' && !isNaN(parseFloat(targetBalanceInput))
    ? Number((parseFloat(targetBalanceInput) - currentAdjustingBalance).toFixed(2))
    : null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Manage Accounts & Reconciliations</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Live-derived account balances. Reconcile balances with dedicated adjustments without skewing income or expense analytics.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </span>
      </div>

      {/* Starter Suggestions */}
      {accounts.length === 0 && (
        <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
          <p>Optional starter examples: NIC Asia Bank, Global IME Bank, Siddhartha Bank, eSewa, Khalti, and Cash.</p>
          <button
            type="button"
            onClick={addSuggestions}
            disabled={busy}
            className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 cursor-pointer"
          >
            Add these examples
          </button>
        </div>
      )}

      {/* Add Account Form */}
      <form onSubmit={addAccount} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          placeholder="Account name, e.g. NIC Asia or eSewa Wallet"
          className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value as AccountType)}
          className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        >
          {ACCOUNT_TYPES.map((option) => (
            <option key={option.value} value={option.value} className="bg-white dark:bg-zinc-800">
              {option.label}
            </option>
          ))}
        </select>
        <button
          disabled={busy || !name.trim()}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer shadow-xs transition"
        >
          + Add Account
        </button>
      </form>

      {/* Accounts Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => {
          const balance = balances[account.id] ?? 0;
          return (
            <div
              key={account.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-3.5 flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              <div>
                {editingId === account.id ? (
                  <div className="flex gap-2 mb-2">
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 px-2.5 py-1 text-sm dark:border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => submitRename(account.id)}
                      disabled={busy}
                      className="text-xs font-semibold px-2 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs font-semibold px-2 py-1 text-zinc-500 hover:text-zinc-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{account.name}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 capitalize inline-block mt-0.5">
                        {account.type === 'wallet'
                          ? 'Mobile Wallet'
                          : account.type === 'dollar_card'
                          ? 'Dollar Card'
                          : account.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(account.id);
                        setEditingName(account.name);
                      }}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      Rename
                    </button>
                  </div>
                )}

                <div className="mt-3">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Live Balance</div>
                  <p
                    className={`font-mono text-base font-extrabold tracking-tight ${
                      balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    Rs. {formatCurrency(balance)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openAdjustModal(account)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer transition shadow-2xs"
                >
                  ⚖️ Adjust Balance
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(account.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transfers Section */}
      <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Transfer between Accounts</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Internal transfers shift funds between accounts without affecting monthly income, expenses, or savings rate.
            </p>
          </div>
          {(transfers.length > 0 || adjustments.length > 0) && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {showHistory ? 'Hide Reconciliations & Transfers History ▲' : `View History (${adjustments.length} adjustments, ${transfers.length} transfers) ▼`}
            </button>
          )}
        </div>

        <form onSubmit={submitTransfer} className="mt-3 grid gap-2 md:grid-cols-5">
          <select
            required
            value={fromAccountId}
            onChange={(event) => setFromAccountId(event.target.value)}
            className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
          >
            <option value="" className="bg-white dark:bg-zinc-800">From account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id} className="bg-white dark:bg-zinc-800">
                {account.name} (Rs. {formatCurrency(balances[account.id] ?? 0)})
              </option>
            ))}
          </select>
          <select
            required
            value={toAccountId}
            onChange={(event) => setToAccountId(event.target.value)}
            className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
          >
            <option value="" className="bg-white dark:bg-zinc-800">To account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id} className="bg-white dark:bg-zinc-800">
                {account.name} (Rs. {formatCurrency(balances[account.id] ?? 0)})
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={transferAmount}
            onChange={(event) => setTransferAmount(event.target.value)}
            placeholder="Amount (NPR)"
            className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
          />
          <input
            type="date"
            value={transferDate}
            onChange={(event) => setTransferDate(event.target.value)}
            className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
          />
          <button
            disabled={busy || accounts.length < 2 || !fromAccountId || !toAccountId || fromAccountId === toAccountId}
            className="rounded-xl border border-emerald-600 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 cursor-pointer shadow-2xs transition"
          >
            Transfer Funds
          </button>
        </form>
        <input
          value={transferNote}
          onChange={(event) => setTransferNote(event.target.value)}
          maxLength={250}
          placeholder="Optional transfer note (e.g. ATM cash withdrawal, eSewa top-up)"
          className="mt-2 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
        />
      </div>

      {/* History & Verification Drawer */}
      {showHistory && (
        <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHistoryTab('adjustments')}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                  historyTab === 'adjustments'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                Balance Adjustments ({adjustments.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('transfers')}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                  historyTab === 'transfers'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                Transfers ({transfers.length})
              </button>
            </div>
            <span className="text-[11px] text-zinc-500">
              🔒 Verified records are locked against accidental changes
            </span>
          </div>

          {historyTab === 'adjustments' && (
            <div className="space-y-2">
              {adjustments.length === 0 ? (
                <p className="text-xs text-zinc-400 py-3 text-center">No balance adjustments logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Account</th>
                        <th className="py-2 px-2">Note / Reason</th>
                        <th className="py-2 px-2 text-right">Adjustment</th>
                        <th className="py-2 px-2 text-center">Verification</th>
                        <th className="py-2 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                      {adjustments.map((adj) => {
                        const account = accounts.find((a) => a.id === adj.accountId);
                        const isVerified = Boolean(adj.verified);
                        return (
                          <tr key={adj.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50">
                            <td className="py-2 px-2 font-mono whitespace-nowrap">{adj.date}</td>
                            <td className="py-2 px-2 font-semibold whitespace-nowrap">{account?.name ?? 'Unknown Account'}</td>
                            <td className="py-2 px-2 text-zinc-600 dark:text-zinc-300 truncate max-w-[180px]">{adj.note || 'Balance reconciliation'}</td>
                            <td className={`py-2 px-2 text-right font-mono font-bold whitespace-nowrap ${adj.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {adj.amount >= 0 ? '+' : ''}Rs. {formatCurrency(adj.amount)}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  🔒 Verified
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onToggleVerifyAdjustment && onToggleVerifyAdjustment(adj.id, false)}
                                  className="text-[11px] font-medium text-zinc-500 hover:text-emerald-600 cursor-pointer underline"
                                >
                                  Mark Verified
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                {isVerified ? (
                                  <button
                                    type="button"
                                    onClick={() => setUnlockConfirmItem({
                                      type: 'adjustment',
                                      id: adj.id,
                                      description: `Adjustment of ${adj.amount >= 0 ? '+' : ''}Rs. ${formatCurrency(adj.amount)} on ${account?.name ?? 'Account'}`,
                                    })}
                                    className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                                  >
                                    Unlock
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmItem({
                                      type: 'adjustment',
                                      id: adj.id,
                                      isVerified: false,
                                      description: `Adjustment of ${adj.amount >= 0 ? '+' : ''}Rs. ${formatCurrency(adj.amount)} on ${account?.name ?? 'Account'}`,
                                    })}
                                    className="text-[11px] text-rose-500 hover:underline cursor-pointer"
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
            </div>
          )}

          {historyTab === 'transfers' && (
            <div className="space-y-2">
              {transfers.length === 0 ? (
                <p className="text-xs text-zinc-400 py-3 text-center">No transfers logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">From → To</th>
                        <th className="py-2 px-2">Note</th>
                        <th className="py-2 px-2 text-right">Amount</th>
                        <th className="py-2 px-2 text-center">Verification</th>
                        <th className="py-2 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                      {transfers.map((tx) => {
                        const fromAcc = accounts.find((a) => a.id === tx.fromAccountId)?.name ?? 'Unknown';
                        const toAcc = accounts.find((a) => a.id === tx.toAccountId)?.name ?? 'Unknown';
                        const isVerified = Boolean(tx.verified);
                        return (
                          <tr key={tx.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50">
                            <td className="py-2 px-2 font-mono whitespace-nowrap">{tx.date}</td>
                            <td className="py-2 px-2 font-semibold whitespace-nowrap">{fromAcc} → {toAcc}</td>
                            <td className="py-2 px-2 text-zinc-600 dark:text-zinc-300 truncate max-w-[180px]">{tx.note || 'Transfer'}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                              Rs. {formatCurrency(tx.amount)}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  🔒 Verified
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onToggleVerifyTransfer && onToggleVerifyTransfer(tx.id, false)}
                                  className="text-[11px] font-medium text-zinc-500 hover:text-emerald-600 cursor-pointer underline"
                                >
                                  Mark Verified
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                {isVerified ? (
                                  <button
                                    type="button"
                                    onClick={() => setUnlockConfirmItem({
                                      type: 'transfer',
                                      id: tx.id,
                                      description: `Transfer of Rs. ${formatCurrency(tx.amount)} from ${fromAcc} to ${toAcc}`,
                                    })}
                                    className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                                  >
                                    Unlock
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmItem({
                                      type: 'transfer',
                                      id: tx.id,
                                      isVerified: false,
                                      description: `Transfer of Rs. ${formatCurrency(tx.amount)} from ${fromAcc} to ${toAcc}`,
                                    })}
                                    className="text-[11px] text-rose-500 hover:underline cursor-pointer"
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
            </div>
          )}
        </div>
      )}

      {/* Adjust Balance Modal */}
      {adjustingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Adjust Balance: {adjustingAccount.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Current computed balance: <strong>Rs. {formatCurrency(currentAdjustingBalance)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={closeAdjustModal}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {adjError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
                {adjError}
              </div>
            )}

            <form onSubmit={submitAdjustment} className="space-y-4">
              {/* Method Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAdjMode('target')}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${
                    adjMode === 'target' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'
                  }`}
                >
                  Set Actual Balance
                </button>
                <button
                  type="button"
                  onClick={() => setAdjMode('delta')}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${
                    adjMode === 'delta' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'
                  }`}
                >
                  +/- Correction Amount
                </button>
              </div>

              {adjMode === 'target' ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Real-World Current Balance (in NPR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={targetBalanceInput}
                    onChange={(e) => setTargetBalanceInput(e.target.value)}
                    required
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                  {computedDeltaFromTarget !== null && (
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Adjustment required:{' '}
                      <strong className={computedDeltaFromTarget >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {computedDeltaFromTarget >= 0 ? '+' : ''}Rs. {formatCurrency(computedDeltaFromTarget)}
                      </strong>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Correction Amount (in NPR, positive or negative) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={deltaAmountInput}
                    onChange={(e) => setDeltaAmountInput(e.target.value)}
                    required
                    placeholder="e.g. -500 or +1200"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                  {deltaAmountInput !== '' && !isNaN(parseFloat(deltaAmountInput)) && (
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      New balance will be:{' '}
                      <strong>
                        Rs. {formatCurrency(currentAdjustingBalance + parseFloat(deltaAmountInput))}
                      </strong>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Adjustment Date
                </label>
                <input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Reconciliation Note / Reason
                </label>
                <input
                  type="text"
                  maxLength={250}
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  placeholder="e.g. Reconciled with bank statement, counted physical cash"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-2.5 text-[11px] text-amber-900 dark:text-amber-200">
                ⚖️ <strong>Balance Protection:</strong> This adjustment strictly updates <strong>{adjustingAccount.name}</strong>&apos;s balance. It is never included in your income, expense totals, monthly savings, or insights.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAdjustModal}
                  disabled={busy}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {busy ? 'Saving...' : 'Save Balance Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlock Confirmation Modal */}
      {unlockConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <span className="text-lg">⚠️</span>
              <span>Unlock Verified Record?</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              This transaction is verified — unlocking it will allow changes that affect your totals. Continue?
            </p>
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              {unlockConfirmItem.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUnlockConfirmItem(null)}
                disabled={busy}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Keep Locked
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlock}
                disabled={busy}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Unlocking...' : 'Yes, Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <span className="text-lg">🗑️</span>
              <span>Delete {deleteConfirmItem.isVerified ? 'Verified ' : ''}Record?</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {deleteConfirmItem.isVerified
                ? 'This record is marked as verified against statements. Deleting it will permanently alter your calculated balances and history.'
                : 'Are you sure you want to delete this record? This action cannot be undone.'}
            </p>
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              {deleteConfirmItem.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={busy}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={busy}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
