/**
 * @file context/GuestModeContext.tsx
 * @description In-memory React Context for unauthenticated "Try It Out" / Guest Mode.
 * Provides ephemeral state for transactions and stock holdings that persists across
 * client-side route transitions but resets entirely when the browser window is refreshed.
 *
 * Architectural Note:
 * To fulfill the requirement that guest data is temporary and never written to Supabase or
 * stored in local/session storage, state lives exclusively in standard React useState in browser RAM.
 */

'use client';

import React, { createContext, useContext, useState } from 'react';
import { Account, AccountTransfer, BalanceAdjustment, StockHolding, Transaction } from '@/types';

/** Temporary salary-planning data kept only in guest-mode React memory. */
export interface SalaryProfileDraft {
  monthlySalary: number;
  monthlyAllowances: number;
  monthlyDeductions: number;
  expectedMonthlyExpense: number;
  savingsTargetAmount: number | null;
  savingsTargetPercentage: number | null;
}

/** A short, named savings objective for salary planning. */
export interface SavingsGoalDraft {
  id: string;
  name: string;
  targetAmount: number;
}

/**
 * Shape of the context object exposed to consuming components.
 */
interface GuestModeContextType {
  /** Array of in-memory guest transactions (income and expenses) */
  guestTransactions: Transaction[];
  /** Array of in-memory guest NEPSE stock holdings */
  guestHoldings: StockHolding[];
  /** Appends a new guest transaction with a temporary random client ID */
  addGuestTransaction: (tx: Omit<Transaction, 'id'>) => Transaction;
  /** Updates a guest transaction */
  updateGuestTransaction: (id: string, updates: Partial<Transaction>) => void;
  /** Removes a guest transaction by ID */
  deleteGuestTransaction: (id: string) => void;
  /** Clears all guest transactions */
  clearGuestTransactions: () => void;
  /** Guest accounts and internal transfers, stored only in browser memory. */
  guestAccounts: Account[];
  guestTransfers: AccountTransfer[];
  guestAdjustments: BalanceAdjustment[];
  addGuestAccount: (account: Omit<Account, 'id'>) => Account;
  renameGuestAccount: (id: string, name: string) => void;
  deleteGuestAccount: (id: string) => void;
  addGuestTransfer: (transfer: Omit<AccountTransfer, 'id'>) => AccountTransfer;
  updateGuestTransfer: (id: string, updates: Partial<AccountTransfer>) => void;
  deleteGuestTransfer: (id: string) => void;
  addGuestAdjustment: (adj: Omit<BalanceAdjustment, 'id'>) => BalanceAdjustment;
  updateGuestAdjustment: (id: string, updates: Partial<BalanceAdjustment>) => void;
  deleteGuestAdjustment: (id: string) => void;
  /**
   * Records a buy. If a holding in the same symbol already exists it is topped
   * up with a correctly blended weighted-average cost; otherwise a new
   * position is created.
   */
  buyGuestHolding: (buy: {
    symbol: string;
    companyName: string;
    shares: number;
    totalPurchasePrice: number;
    currentPrice: number;
    sector?: string;
  }) => void;
  /**
   * Records a sell against an existing holding. Reduces shares (the average
   * cost per share of the remaining position is unchanged), or removes the
   * holding entirely on a full exit. Returns the realized gain/loss in NPR,
   * or null if the holding could not be found.
   */
  sellGuestHolding: (id: string, sharesSold: number, totalSaleProceeds: number) => number | null;
  /** Updates the market price for an existing in-memory holding */
  updateGuestHoldingPrice: (id: string, currentPrice: number) => void;
  /** Removes a guest stock holding by ID */
  deleteGuestHolding: (id: string) => void;
  /** Clears all guest holdings */
  clearGuestHoldings: () => void;
  /** Guest salary plan; this remains in memory and resets on refresh. */
  guestSalaryProfile: SalaryProfileDraft | null;
  /** Guest savings goals; this remains in memory and resets on refresh. */
  guestSavingsGoals: SavingsGoalDraft[];
  /** Replaces the guest salary profile and goals. */
  saveGuestSalaryPlan: (profile: SalaryProfileDraft, goals: SavingsGoalDraft[]) => void;
}

const GuestModeContext = createContext<GuestModeContextType | undefined>(undefined);

/**
 * React Context Provider that wraps the component tree to supply ephemeral guest state.
 *
 * @param children - Child React component tree.
 */
export function GuestModeProvider({ children }: { children: React.ReactNode }) {
  // Pure in-memory React state — no localStorage or sessionStorage is used to guarantee
  // that data automatically resets upon page refresh.
  const [guestTransactions, setGuestTransactions] = useState<Transaction[]>([]);
  const [guestAccounts, setGuestAccounts] = useState<Account[]>([]);
  const [guestTransfers, setGuestTransfers] = useState<AccountTransfer[]>([]);
  const [guestAdjustments, setGuestAdjustments] = useState<BalanceAdjustment[]>([]);
  const [guestHoldings, setGuestHoldings] = useState<StockHolding[]>([]);
  const [guestSalaryProfile, setGuestSalaryProfile] = useState<SalaryProfileDraft | null>(null);
  const [guestSavingsGoals, setGuestSavingsGoals] = useState<SavingsGoalDraft[]>([]);

  /**
   * Adds an income or expense transaction to guest memory.
   */
  const addGuestTransaction = (tx: Omit<Transaction, 'id'>): Transaction => {
    const newTx: Transaction = {
      ...tx,
      // Generate a temporary unique guest identifier
      id: `guest-tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    setGuestTransactions((prev) => [newTx, ...prev]);
    return newTx;
  };

  /**
   * Updates an existing guest transaction.
   */
  const updateGuestTransaction = (id: string, updates: Partial<Transaction>) => {
    setGuestTransactions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  /**
   * Deletes a guest transaction by its unique ID (skips verified transactions).
   */
  const deleteGuestTransaction = (id: string) => {
    setGuestTransactions((prev) => prev.filter((item) => item.id !== id || item.verified));
  };

  /**
   * Resets unverified in-memory guest transactions; verified records are preserved.
   */
  const clearGuestTransactions = () => {
    setGuestTransactions((prev) => prev.filter((item) => item.verified));
  };

  const addGuestAccount = (account: Omit<Account, 'id'>): Account => {
    const newAccount = { ...account, id: `guest-account-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setGuestAccounts((previous) => [...previous, newAccount]);
    return newAccount;
  };

  const renameGuestAccount = (id: string, name: string) => {
    setGuestAccounts((previous) => previous.map((account) => account.id === id ? { ...account, name } : account));
  };

  const deleteGuestAccount = (id: string) => {
    setGuestAccounts((previous) => previous.filter((account) => account.id !== id));
  };

  const addGuestTransfer = (transfer: Omit<AccountTransfer, 'id'>): AccountTransfer => {
    const newTransfer = { ...transfer, id: `guest-transfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setGuestTransfers((previous) => [newTransfer, ...previous]);
    return newTransfer;
  };

  const updateGuestTransfer = (id: string, updates: Partial<AccountTransfer>) => {
    setGuestTransfers((previous) =>
      previous.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteGuestTransfer = (id: string) => {
    setGuestTransfers((previous) => previous.filter((t) => t.id !== id || t.verified));
  };

  const addGuestAdjustment = (adj: Omit<BalanceAdjustment, 'id'>): BalanceAdjustment => {
    const newAdjustment = {
      ...adj,
      id: `guest-adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setGuestAdjustments((previous) => [newAdjustment, ...previous]);
    return newAdjustment;
  };

  const updateGuestAdjustment = (id: string, updates: Partial<BalanceAdjustment>) => {
    setGuestAdjustments((previous) =>
      previous.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const deleteGuestAdjustment = (id: string) => {
    setGuestAdjustments((previous) => previous.filter((a) => a.id !== id || a.verified));
  };

  /**
   * Records a buy against guest memory, blending into an existing same-symbol
   * position (weighted-average cost) rather than creating a duplicate row.
   */
  const buyGuestHolding = (buy: {
    symbol: string;
    companyName: string;
    shares: number;
    totalPurchasePrice: number;
    currentPrice: number;
    sector?: string;
  }) => {
    setGuestHoldings((prev) => {
      const existing = prev.find((h) => h.symbol === buy.symbol);
      if (existing) {
        const combinedShares = existing.shares + buy.shares;
        const combinedInvested = existing.shares * existing.averagePurchasePrice + buy.totalPurchasePrice;
        return prev.map((h) =>
          h.id === existing.id
            ? {
                ...h,
                shares: combinedShares,
                averagePurchasePrice: combinedInvested / combinedShares,
                currentPrice: buy.currentPrice,
                sector: h.sector ?? buy.sector,
              }
            : h
        );
      }

      const newHolding: StockHolding = {
        id: `guest-holding-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        symbol: buy.symbol,
        companyName: buy.companyName,
        shares: buy.shares,
        averagePurchasePrice: buy.totalPurchasePrice / buy.shares,
        currentPrice: buy.currentPrice,
        sector: buy.sector,
      };
      return [newHolding, ...prev];
    });
  };

  /**
   * Records a sell against an existing guest holding. The average cost per
   * share of a weighted-average position does not change on a partial sell —
   * only the quantity (and so total invested) shrinks — so this only needs to
   * reduce shares, or remove the row entirely on a full exit.
   */
  const sellGuestHolding = (id: string, sharesSold: number, totalSaleProceeds: number): number | null => {
    const holding = guestHoldings.find((h) => h.id === id);
    if (!holding) return null;

    const realizedGain = totalSaleProceeds - sharesSold * holding.averagePurchasePrice;
    const remainingShares = holding.shares - sharesSold;

    if (remainingShares <= 0) {
      setGuestHoldings((prev) => prev.filter((h) => h.id !== id));
    } else {
      setGuestHoldings((prev) =>
        prev.map((h) => (h.id === id ? { ...h, shares: remainingShares } : h))
      );
    }

    return realizedGain;
  };

  /**
   * Updates the current market price of an in-memory stock holding.
   */
  const updateGuestHoldingPrice = (id: string, currentPrice: number) => {
    setGuestHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, currentPrice } : h))
    );
  };

  /**
   * Deletes a stock holding from guest memory.
   */
  const deleteGuestHolding = (id: string) => {
    setGuestHoldings((prev) => prev.filter((item) => item.id !== id));
  };

  /**
   * Resets all in-memory stock holdings.
   */
  const clearGuestHoldings = () => {
    setGuestHoldings([]);
  };

  const saveGuestSalaryPlan = (profile: SalaryProfileDraft, goals: SavingsGoalDraft[]) => {
    setGuestSalaryProfile(profile);
    setGuestSavingsGoals(goals);
  };

  return (
    <GuestModeContext.Provider
      value={{
        guestTransactions,
        guestHoldings,
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
        buyGuestHolding,
        sellGuestHolding,
        updateGuestHoldingPrice,
        deleteGuestHolding,
        clearGuestHoldings,
        guestSalaryProfile,
        guestSavingsGoals,
        saveGuestSalaryPlan,
      }}
    >
      {children}
    </GuestModeContext.Provider>
  );
}

/**
 * Custom hook to access in-memory guest state and transaction/holding dispatchers.
 *
 * @throws Error if called outside a GuestModeProvider subtree.
 * @returns GuestModeContextType
 */
export function useGuestMode() {
  const context = useContext(GuestModeContext);
  if (!context) {
    throw new Error('useGuestMode must be used within a GuestModeProvider');
  }
  return context;
}
