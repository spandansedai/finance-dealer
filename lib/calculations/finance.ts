import { SavingsSummary, Transaction, TransactionType } from '@/types';

/**
 * Pure calculation engine for Nepali Personal Finance & NEPSE OS
 */

/**
 * Calculates monthly savings: monthlyIncome - monthlyExpenses
 */
export function calculateMonthlySavings(monthlyIncome: number, monthlyExpenses: number): number {
  const income = Number(monthlyIncome) || 0;
  const expenses = Number(monthlyExpenses) || 0;
  return income - expenses;
}

/**
 * Alias for calculateMonthlySavings for backwards compatibility
 */
export function calculateNetSavings(totalIncome: number, totalExpenses: number): number {
  return calculateMonthlySavings(totalIncome, totalExpenses);
}

/**
 * Calculates savings rate percentage: (monthlySavings / monthlyIncome) * 100
 * Handles edge cases:
 * - If monthlyIncome <= 0, returns 0 to prevent NaN or Infinity.
 * - Negative savings return negative savings rate percentage rounded to 2 decimal places.
 */
export function calculateSavingsRate(monthlyIncome: number, monthlyExpenses: number): number {
  const income = Number(monthlyIncome) || 0;
  const expenses = Number(monthlyExpenses) || 0;

  if (income <= 0) {
    return 0;
  }

  const savings = calculateMonthlySavings(income, expenses);
  const rate = (savings / income) * 100;
  return Number(rate.toFixed(2));
}

/**
 * Calculates projected annual savings: monthlySavings * 12
 */
export function calculateAnnualSavings(monthlySavings: number): number {
  const savings = Number(monthlySavings) || 0;
  return savings * 12;
}

/**
 * Calculates all savings metrics in one summary object
 */
export function calculateSavingsSummary(monthlyIncome: number, monthlyExpenses: number): SavingsSummary {
  const income = Number(monthlyIncome) || 0;
  const expenses = Number(monthlyExpenses) || 0;
  const monthlySavings = calculateMonthlySavings(income, expenses);
  const savingsRate = calculateSavingsRate(income, expenses);
  const annualSavings = calculateAnnualSavings(monthlySavings);

  return {
    monthlyIncome: income,
    monthlyExpenses: expenses,
    monthlySavings,
    savingsRate,
    annualSavings,
  };
}

/**
 * Currency formatting helper for Nepali Rupees
 */
export function formatNepaliCurrency(amount: number, prefix: string = 'Rs. '): string {
  const num = Number(amount) || 0;
  const isNegative = num < 0;
  const absFormatted = new Intl.NumberFormat('en-NP', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Math.abs(num));

  if (isNegative) {
    return `-${prefix}${absFormatted}`;
  }
  return `${prefix}${absFormatted}`;
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
