'use client';

import { useState } from 'react';
import { Account, AccountType } from '@/types';

const ACCOUNT_TYPES: Array<{ value: AccountType; label: string }> = [
  { value: 'bank', label: 'Bank' }, { value: 'wallet', label: 'Mobile wallet' },
  { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'other', label: 'Other' },
];

// Suggestions are UI-only examples, not provisioned accounts or a permanent list.
const STARTER_ACCOUNTS: Array<Omit<Account, 'id'>> = [
  { name: 'NIC Asia Bank', type: 'bank' }, { name: 'Global IME Bank', type: 'bank' },
  { name: 'Siddhartha Bank', type: 'bank' }, { name: 'eSewa', type: 'wallet' },
  { name: 'Khalti', type: 'wallet' }, { name: 'Cash', type: 'cash' },
];

interface AccountsManagerProps {
  accounts: Account[];
  balances: Record<string, number>;
  onAdd: (name: string, type: AccountType) => Promise<boolean>;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onTransfer: (fromAccountId: string, toAccountId: string, amount: number, date: string, note: string) => Promise<boolean>;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('en-NP', { maximumFractionDigits: 2 }).format(value);

export function AccountsManager({ accounts, balances, onAdd, onRename, onDelete, onTransfer }: AccountsManagerProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [transferNote, setTransferNote] = useState('');
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
    if (await onRename(id, editingName.trim())) { setEditingId(null); setEditingName(''); }
    setBusy(false);
  };

  const submitTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(transferAmount);
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId || !amount || amount <= 0) return;
    setBusy(true);
    if (await onTransfer(fromAccountId, toAccountId, amount, transferDate, transferNote.trim())) {
      setTransferAmount(''); setTransferNote('');
    }
    setBusy(false);
  };

  return <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-base font-bold">Manage Accounts</h2><p className="text-xs text-zinc-500 dark:text-zinc-400">Create any number of banks, wallets, cash accounts, cards, or custom accounts.</p></div><span className="text-xs text-zinc-500">{accounts.length} accounts</span></div>
    {accounts.length === 0 && <div className="mt-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"><p>Optional starter examples: NIC Asia Bank, Global IME Bank, Siddhartha Bank, eSewa, Khalti, and Cash. They are ordinary editable accounts, not a fixed list.</p><button type="button" onClick={addSuggestions} disabled={busy} className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">Add these examples</button></div>}
    <form onSubmit={addAccount} className="mt-4 grid gap-2 sm:grid-cols-[1fr_160px_auto]"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Account name, e.g. My bank" className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><select value={type} onChange={(event) => setType(event.target.value as AccountType)} className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700">{ACCOUNT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60">Add account</button></form>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{accounts.map((account) => <div key={account.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">{editingId === account.id ? <div className="flex gap-2"><input value={editingName} onChange={(event) => setEditingName(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700" /><button type="button" onClick={() => submitRename(account.id)} className="text-xs font-semibold text-emerald-600">Save</button></div> : <><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-sm">{account.name}</p><p className="text-xs capitalize text-zinc-500">{account.type === 'wallet' ? 'Mobile wallet' : account.type}</p></div><button type="button" onClick={() => { setEditingId(account.id); setEditingName(account.name); }} className="text-xs text-emerald-600">Rename</button></div><p className={`mt-3 font-mono text-sm font-bold ${(balances[account.id] ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Rs. {formatCurrency(balances[account.id] ?? 0)}</p><button type="button" onClick={() => onDelete(account.id)} className="mt-2 text-xs text-rose-600 hover:underline">Delete</button></>}</div>)}</div>
    <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800"><h3 className="text-sm font-bold">Transfer between your accounts</h3><p className="mt-1 text-xs text-zinc-500">Transfers update account balances only; they never count as income or expense.</p><form onSubmit={submitTransfer} className="mt-3 grid gap-2 md:grid-cols-5"><select required value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"><option value="">From account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><select required value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"><option value="">To account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><input required type="number" min="0.01" step="0.01" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} placeholder="Amount (NPR)" className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><input type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} className="rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><button disabled={busy || accounts.length < 2} className="rounded-xl border border-emerald-600 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400">Transfer</button></form><input value={transferNote} onChange={(event) => setTransferNote(event.target.value)} maxLength={250} placeholder="Optional transfer note" className="mt-2 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /></div>
  </section>;
}
