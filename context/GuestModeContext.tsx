'use client';

import React, { createContext, useContext, useState } from 'react';
import { StockHolding, Transaction } from '@/types';

interface GuestModeContextType {
  guestTransactions: Transaction[];
  guestHoldings: StockHolding[];
  addGuestTransaction: (tx: Omit<Transaction, 'id'>) => Transaction;
  deleteGuestTransaction: (id: string) => void;
  clearGuestTransactions: () => void;
  addGuestHolding: (holding: Omit<StockHolding, 'id'>) => StockHolding;
  updateGuestHoldingPrice: (id: string, currentPrice: number) => void;
  deleteGuestHolding: (id: string) => void;
  clearGuestHoldings: () => void;
}

const GuestModeContext = createContext<GuestModeContextType | undefined>(undefined);

export function GuestModeProvider({ children }: { children: React.ReactNode }) {
  const [guestTransactions, setGuestTransactions] = useState<Transaction[]>([]);
  const [guestHoldings, setGuestHoldings] = useState<StockHolding[]>([]);

  const addGuestTransaction = (tx: Omit<Transaction, 'id'>): Transaction => {
    const newTx: Transaction = {
      ...tx,
      id: `guest-tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    setGuestTransactions((prev) => [newTx, ...prev]);
    return newTx;
  };

  const deleteGuestTransaction = (id: string) => {
    setGuestTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  const clearGuestTransactions = () => {
    setGuestTransactions([]);
  };

  const addGuestHolding = (holding: Omit<StockHolding, 'id'>): StockHolding => {
    const newHolding: StockHolding = {
      ...holding,
      id: `guest-holding-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    setGuestHoldings((prev) => [newHolding, ...prev]);
    return newHolding;
  };

  const updateGuestHoldingPrice = (id: string, currentPrice: number) => {
    setGuestHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, currentPrice } : h))
    );
  };

  const deleteGuestHolding = (id: string) => {
    setGuestHoldings((prev) => prev.filter((item) => item.id !== id));
  };

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

export function useGuestMode() {
  const context = useContext(GuestModeContext);
  if (!context) {
    throw new Error('useGuestMode must be used within a GuestModeProvider');
  }
  return context;
}
