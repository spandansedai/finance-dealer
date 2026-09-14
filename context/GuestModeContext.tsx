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
import { StockHolding, Transaction } from '@/types';

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
  /** Removes a guest transaction by ID */
  deleteGuestTransaction: (id: string) => void;
  /** Clears all guest transactions */
  clearGuestTransactions: () => void;
  /** Appends a new guest NEPSE stock holding with a temporary random client ID */
  addGuestHolding: (holding: Omit<StockHolding, 'id'>) => StockHolding;
  /** Updates the market price for an existing in-memory holding */
  updateGuestHoldingPrice: (id: string, currentPrice: number) => void;
  /** Removes a guest stock holding by ID */
  deleteGuestHolding: (id: string) => void;
  /** Clears all guest holdings */
  clearGuestHoldings: () => void;
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
  const [guestHoldings, setGuestHoldings] = useState<StockHolding[]>([]);

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
   * Deletes a guest transaction by its unique ID.
   */
  const deleteGuestTransaction = (id: string) => {
    setGuestTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  /**
   * Resets the in-memory guest transactions list.
   */
  const clearGuestTransactions = () => {
    setGuestTransactions([]);
  };

  /**
   * Adds a NEPSE stock position to guest memory.
   */
  const addGuestHolding = (holding: Omit<StockHolding, 'id'>): StockHolding => {
    const newHolding: StockHolding = {
      ...holding,
      // Generate a temporary unique guest identifier
      id: `guest-holding-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    setGuestHoldings((prev) => [newHolding, ...prev]);
    return newHolding;
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

  return (
    <GuestModeContext.Provider
      value={{
        guestTransactions,
        guestHoldings,
        addGuestTransaction,
        deleteGuestTransaction,
        clearGuestTransactions,
        addGuestHolding,
        updateGuestHoldingPrice,
        deleteGuestHolding,
        clearGuestHoldings,
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
