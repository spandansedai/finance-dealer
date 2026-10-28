'use client';

import React, { useState } from 'react';
import { Account, AccountTransfer, AccountType, BalanceAdjustment } from '@/types';
import { formatNepaliNumber } from '@/lib/calculations/finance';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
  EmptyBody,
  EmptyState,
  FieldHint,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Notice,
  Panel,
  Select,
  Tag,
} from '@/components/ui';

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

const formatCurrency = formatNepaliNumber;

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
    <Card as="section">
      {/* Header */}
      <CardHeader>
        <div>
          <CardTitle>
            Accounts &amp; reconciliation
          </CardTitle>
          <CardSubtitle>
            Live-derived balances. Reconcile with a dedicated adjustment without distorting income
            or expense totals.
          </CardSubtitle>
        </div>
        <Tag>
          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </Tag>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Starter Suggestions */}
        {accounts.length === 0 && (
          <EmptyState>
            <EmptyBody>
              Suggested default accounts: NIC Asia Bank, Global IME Bank, Siddhartha Bank, eSewa,
              Khalti, and Cash.
            </EmptyBody>
            <Button variant="primary" size="sm" type="button" onClick={addSuggestions} disabled={busy} className="mt-3">
              Add suggested accounts
            </Button>
          </EmptyState>
        )}

        {/* Add Account Form */}
        <form onSubmit={addAccount} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="Account name, e.g. NIC Asia or eSewa Wallet"
          />
          <Select value={type} onChange={(event) => setType(event.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button variant="primary" disabled={busy || !name.trim()}>
            Add account
          </Button>
        </form>

        {/* Accounts Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const balance = balances[account.id] ?? 0;
            return (
              <Panel key={account.id} className="flex flex-col justify-between rounded-xl p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-rule-strong hover:shadow-raised">
                <div>
                  {editingId === account.id ? (
                    <div className="mb-2 flex gap-2">
                      <Input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className="min-w-0 flex-1"
                      />
                      <Button variant="primary" size="sm" type="button" onClick={() => submitRename(account.id)} disabled={busy}>
                        Save
                      </Button>
                      <Button variant="link" size="sm" type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-ink sm:text-body">{account.name}</p>
                        <Tag className="mt-1 capitalize">
                          {account.type === 'wallet'
                            ? 'Mobile wallet'
                            : account.type === 'dollar_card'
                            ? 'Dollar Card'
                            : account.type}
                        </Tag>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setEditingId(account.id);
                          setEditingName(account.name);
                        }}
                      >
                        Rename
                      </Button>
                    </div>
                  )}

                  <div className="mt-3 border-t border-rule pt-2">
                    <p className="text-body text-ink-soft">Live balance</p>
                    <p className={`fig fig-lg mt-0.5 ${balance < 0 ? 'fig-loss' : 'fig-gain'}`}>
                      <span className="unit">Rs</span>
                      {formatCurrency(balance)}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-rule pt-2.5">
                  <Button
                    variant="link"
                    tone="warn"
                    size="sm"
                    type="button"
                    onClick={() => openAdjustModal(account)}
                  >
                    Reconcile
                  </Button>
                  <Button variant="link" tone="danger" size="sm" type="button" onClick={() => onDelete(account.id)}>
                    Delete
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>

        {/* Transfers Section */}
        <div className="border-t border-rule pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle as="h3">Transfer between accounts</CardTitle>
              <CardSubtitle>
                Internal transfers shift funds between accounts without affecting income, expenses, or savings rate.
              </CardSubtitle>
            </div>
            {(transfers.length > 0 || adjustments.length > 0) && (
              <Button variant="link" size="sm" type="button" onClick={() => setShowHistory((prev) => !prev)}>
                {showHistory ? 'Hide history' : `View history (${adjustments.length} adjustments, ${transfers.length} transfers)`}
              </Button>
            )}
          </div>

          <form onSubmit={submitTransfer} className="mt-3 grid gap-2 md:grid-cols-5">
            <Select required value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)}>
              <option value="">From account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} (Rs {formatCurrency(balances[account.id] ?? 0)})
                </option>
              ))}
            </Select>
            <Select required value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>
              <option value="">To account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} (Rs {formatCurrency(balances[account.id] ?? 0)})
                </option>
              ))}
            </Select>
            <Input
              numeric
              required
              type="number"
              min="0.01"
              step="0.01"
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
              placeholder="Amount (NPR)"
            />
            <Input type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} />
            <Button
              variant="primary"
              disabled={busy || accounts.length < 2 || !fromAccountId || !toAccountId || fromAccountId === toAccountId}
            >
              Transfer funds
            </Button>
          </form>
          <Input
            value={transferNote}
            onChange={(event) => setTransferNote(event.target.value)}
            maxLength={250}
            placeholder="Optional note, e.g. ATM cash withdrawal, eSewa top-up"
            className="mt-2 w-full"
          />
        </div>

        {/* History & Verification Drawer */}
        {showHistory && (
          <Panel className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-2">
              <div className="seg">
                <button type="button" aria-pressed={historyTab === 'adjustments'} onClick={() => setHistoryTab('adjustments')}>
                  Balance adjustments ({adjustments.length})
                </button>
                <button type="button" aria-pressed={historyTab === 'transfers'} onClick={() => setHistoryTab('transfers')}>
                  Transfers ({transfers.length})
                </button>
              </div>
              <span className="text-body italic text-ink-faint">Verified records are locked against alteration.</span>
            </div>

            {historyTab === 'adjustments' && (
              <div>
                {adjustments.length === 0 ? (
                  <p className="fig fig-sm fig-mute py-3 text-center">No balance adjustments logged yet.</p>
                ) : (
                  <div className="scroll-x">
                    <table className="floor">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Account</th>
                          <th>Note / reason</th>
                          <th className="text-right">Adjustment</th>
                          <th className="text-center">Verification</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustments.map((adj) => {
                          const account = accounts.find((a) => a.id === adj.accountId);
                          const isVerified = Boolean(adj.verified);
                          return (
                            <tr key={adj.id}>
                              <td className="fig fig-sm whitespace-nowrap">{adj.date}</td>
                              <td className="whitespace-nowrap text-body font-medium text-ink">{account?.name ?? 'Unknown account'}</td>
                              <td className="max-w-[180px] truncate text-body text-ink-soft">{adj.note || 'Balance reconciliation'}</td>
                              <td className="num">
                                <span className={`fig fig-md ${adj.amount >= 0 ? 'fig-gain' : 'fig-loss'}`}>
                                  {adj.amount >= 0 ? '+' : ''}<span className="unit">Rs</span>{formatCurrency(adj.amount)}
                                </span>
                              </td>
                              <td className="text-center whitespace-nowrap">
                                {isVerified ? (
                                  <Tag tone="warn">Verified</Tag>
                                ) : (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    type="button"
                                    onClick={() => onToggleVerifyAdjustment && onToggleVerifyAdjustment(adj.id, false)}
                                  >
                                    Mark verified
                                  </Button>
                                )}
                              </td>
                              <td className="text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2.5">
                                  {isVerified ? (
                                    <Button
                                      variant="link"
                                      tone="warn"
                                      size="sm"
                                      type="button"
                                      onClick={() => setUnlockConfirmItem({
                                        type: 'adjustment',
                                        id: adj.id,
                                        description: `Adjustment of ${adj.amount >= 0 ? '+' : ''}Rs ${formatCurrency(adj.amount)} on ${account?.name ?? 'Account'}`,
                                      })}
                                    >
                                      Unlock
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="link"
                                      tone="danger"
                                      size="sm"
                                      type="button"
                                      onClick={() => setDeleteConfirmItem({
                                        type: 'adjustment',
                                        id: adj.id,
                                        isVerified: false,
                                        description: `Adjustment of ${adj.amount >= 0 ? '+' : ''}Rs ${formatCurrency(adj.amount)} on ${account?.name ?? 'Account'}`,
                                      })}
                                    >
                                      Delete
                                    </Button>
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
              <div>
                {transfers.length === 0 ? (
                  <p className="fig fig-sm fig-mute py-3 text-center">No transfers logged yet.</p>
                ) : (
                  <div className="scroll-x">
                    <table className="floor">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>From &rarr; to</th>
                          <th>Note</th>
                          <th className="text-right">Amount</th>
                          <th className="text-center">Verification</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((tx) => {
                          const fromAcc = accounts.find((a) => a.id === tx.fromAccountId)?.name ?? 'Unknown';
                          const toAcc = accounts.find((a) => a.id === tx.toAccountId)?.name ?? 'Unknown';
                          const isVerified = Boolean(tx.verified);
                          return (
                            <tr key={tx.id}>
                              <td className="fig fig-sm whitespace-nowrap">{tx.date}</td>
                              <td className="whitespace-nowrap text-body font-medium text-ink">{fromAcc} &rarr; {toAcc}</td>
                              <td className="max-w-[180px] truncate text-body text-ink-soft">{tx.note || 'Transfer'}</td>
                              <td className="num">
                                <span className="fig fig-md"><span className="unit">Rs</span>{formatCurrency(tx.amount)}</span>
                              </td>
                              <td className="text-center whitespace-nowrap">
                                {isVerified ? (
                                  <Tag tone="warn">Verified</Tag>
                                ) : (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    type="button"
                                    onClick={() => onToggleVerifyTransfer && onToggleVerifyTransfer(tx.id, false)}
                                  >
                                    Mark verified
                                  </Button>
                                )}
                              </td>
                              <td className="text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2.5">
                                  {isVerified ? (
                                    <Button
                                      variant="link"
                                      tone="warn"
                                      size="sm"
                                      type="button"
                                      onClick={() => setUnlockConfirmItem({
                                        type: 'transfer',
                                        id: tx.id,
                                        description: `Transfer of Rs ${formatCurrency(tx.amount)} from ${fromAcc} to ${toAcc}`,
                                      })}
                                    >
                                      Unlock
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="link"
                                      tone="danger"
                                      size="sm"
                                      type="button"
                                      onClick={() => setDeleteConfirmItem({
                                        type: 'transfer',
                                        id: tx.id,
                                        isVerified: false,
                                        description: `Transfer of Rs ${formatCurrency(tx.amount)} from ${fromAcc} to ${toAcc}`,
                                      })}
                                    >
                                      Delete
                                    </Button>
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
          </Panel>
        )}
      </CardBody>

      {/* Adjust Balance Modal */}
      {adjustingAccount && (
        <ModalOverlay>
          <Modal>
            <ModalHeader>
              <div>
                <h3>Reconcile: {adjustingAccount.name}</h3>
                <p className="fig fig-sm fig-mute mt-0.5">
                  Current computed balance: Rs {formatCurrency(currentAdjustingBalance)}
                </p>
              </div>
              <Button variant="link" size="sm" type="button" onClick={closeAdjustModal}>
                Close
              </Button>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {adjError && <Notice tone="loss">{adjError}</Notice>}

              <form id="adjust-balance-form" onSubmit={submitAdjustment} className="space-y-4">
                {/* Method Switcher */}
                <div className="seg w-full">
                  <button type="button" aria-pressed={adjMode === 'target'} onClick={() => setAdjMode('target')} className="flex-1">
                    Set actual balance
                  </button>
                  <button type="button" aria-pressed={adjMode === 'delta'} onClick={() => setAdjMode('delta')} className="flex-1">
                    +/&minus; delta correction
                  </button>
                </div>

                {adjMode === 'target' ? (
                  <div>
                    <Label>Real-world statement balance (NPR)</Label>
                    <Input
                      numeric
                      type="number"
                      step="any"
                      value={targetBalanceInput}
                      onChange={(e) => setTargetBalanceInput(e.target.value)}
                      required
                      placeholder="e.g. 15000"
                    />
                    {computedDeltaFromTarget !== null && (
                      <FieldHint>
                        Adjustment required:{' '}
                        <span className={`fig fig-sm ${computedDeltaFromTarget >= 0 ? 'fig-gain' : 'fig-loss'}`}>
                          {computedDeltaFromTarget >= 0 ? '+' : ''}Rs {formatCurrency(computedDeltaFromTarget)}
                        </span>
                      </FieldHint>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label>Correction amount (NPR, positive or negative)</Label>
                    <Input
                      numeric
                      type="number"
                      step="any"
                      value={deltaAmountInput}
                      onChange={(e) => setDeltaAmountInput(e.target.value)}
                      required
                      placeholder="e.g. -500 or +1200"
                    />
                    {deltaAmountInput !== '' && !isNaN(parseFloat(deltaAmountInput)) && (
                      <FieldHint>
                        New balance will be:{' '}
                        <span className="fig fig-sm">Rs {formatCurrency(currentAdjustingBalance + parseFloat(deltaAmountInput))}</span>
                      </FieldHint>
                    )}
                  </div>
                )}

                <div>
                  <Label>Adjustment date</Label>
                  <Input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
                </div>

                <div>
                  <Label>Reconciliation note / reason</Label>
                  <Input
                    type="text"
                    maxLength={250}
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    placeholder="e.g. Reconciled with bank statement, physical cash recount"
                  />
                </div>

                <Notice tone="warn">
                  <span>
                    <strong>Balance protection:</strong> this adjustment strictly updates{' '}
                    <strong>{adjustingAccount.name}</strong>&apos;s balance. It is never included in
                    income, expenses, monthly savings, or insights.
                  </span>
                </Notice>
              </form>
            </ModalBody>
            <ModalFooter>
              <Button size="sm" type="button" onClick={closeAdjustModal} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" form="adjust-balance-form" disabled={busy}>
                {busy ? 'Saving…' : 'Save adjustment'}
              </Button>
            </ModalFooter>
          </Modal>
        </ModalOverlay>
      )}

      {/* Unlock Confirmation Modal */}
      {unlockConfirmItem && (
        <ModalOverlay>
          <Modal className="max-w-sm">
            <ModalHeader>
              <h3>Unlock verified record?</h3>
            </ModalHeader>
            <ModalBody className="space-y-3">
              <p className="text-body leading-relaxed text-ink-soft">
                This record is verified against your statement. Unlocking it will allow edits or
                deletion that affect your computed balances.
              </p>
              <Panel as="p" className="fig fig-sm fig-mute p-2">
                {unlockConfirmItem.description}
              </Panel>
            </ModalBody>
            <ModalFooter>
              <Button size="sm" type="button" onClick={() => setUnlockConfirmItem(null)} disabled={busy}>
                Keep locked
              </Button>
              <Button variant="warn" size="sm" type="button" onClick={handleConfirmUnlock} disabled={busy}>
                {busy ? 'Unlocking…' : 'Yes, unlock'}
              </Button>
            </ModalFooter>
          </Modal>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <ModalOverlay>
          <Modal className="max-w-sm">
            <ModalHeader>
              <h3>Delete {deleteConfirmItem.isVerified ? 'verified ' : ''}record?</h3>
            </ModalHeader>
            <ModalBody className="space-y-3">
              <p className="text-body leading-relaxed text-ink-soft">
                {deleteConfirmItem.isVerified
                  ? 'This record is marked as verified against statements. Deleting it will permanently alter your calculated balances and history.'
                  : 'Are you sure you want to delete this record? This action cannot be undone.'}
              </p>
              <Panel as="p" className="fig fig-sm fig-mute p-2">
                {deleteConfirmItem.description}
              </Panel>
            </ModalBody>
            <ModalFooter>
              <Button size="sm" type="button" onClick={() => setDeleteConfirmItem(null)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="button" onClick={handleConfirmDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete record'}
              </Button>
            </ModalFooter>
          </Modal>
        </ModalOverlay>
      )}
    </Card>
  );
}
