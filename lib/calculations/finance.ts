import { Transaction, TransactionType } from '@/types';

/**
 * Pure calculation engine for Nepali Personal Finance & NEPSE OS
 */

export function calculateNetSavings(totalIncome: number, totalExpenses: number): number {
  return totalIncome - totalExpenses;
}

export function calculateSavingsRate(totalIncome: number, totalExpenses: number): number {
  if (totalIncome <= 0) return 0;
  const savings = calculateNetSavings(totalIncome, totalExpenses);
  return Number(((savings / totalIncome) * 100).toFixed(2));
}

export function calculateTotalByType(transactions: Transaction[], type: TransactionType): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

export function calculateCategoryBreakdown(
  transactions: Transaction[],
  type: TransactionType
): Record<string, number> {
  return transactions
    .filter((t) => t.type === type)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + (Number(t.amount) || 0);
      return acc;
    }, {} as Record<string, number>);
}

export function calculatePortfolioValue(holdings: Array<{ units: number; currentPrice: number }>): number {
  return holdings.reduce((sum, h) => sum + h.units * h.currentPrice, 0);
}

export function calculatePortfolioGainLoss(
  holdings: Array<{ units: number; buyPrice: number; currentPrice: number }>
): { totalInvestment: number; currentValue: number; gainLoss: number; gainLossPercentage: number } {
  const totalInvestment = holdings.reduce((sum, h) => sum + h.units * h.buyPrice, 0);
  const currentValue = holdings.reduce((sum, h) => sum + h.units * h.currentPrice, 0);
  const gainLoss = currentValue - totalInvestment;
  const gainLossPercentage = totalInvestment > 0 ? Number(((gainLoss / totalInvestment) * 100).toFixed(2)) : 0;

  return {
    totalInvestment,
    currentValue,
    gainLoss,
    gainLossPercentage,
  };
}
