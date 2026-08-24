import {
  HoldingAnalytics,
  PortfolioAnalyticsSummary,
  SavingsSummary,
  StockHolding,
  Transaction,
  TransactionType,
} from '@/types';

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
  return Number.isFinite(rate) ? Number(rate.toFixed(2)) : 0;
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
 * Currency formatting helper for Nepali Rupees (NPR)
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

/* ==========================================================================
   V0.5: Portfolio Analytics Pure Calculation Engine
   ========================================================================== */

/**
 * Calculates invested amount for a holding: shares × average purchase price
 */
export function calculateHoldingInvested(shares: number, averagePurchasePrice: number): number {
  const s = Math.max(0, Number(shares) || 0);
  const price = Math.max(0, Number(averagePurchasePrice) || 0);
  return s * price;
}

/**
 * Calculates current value for a holding: shares × current price
 */
export function calculateHoldingCurrentValue(shares: number, currentPrice: number): number {
  const s = Math.max(0, Number(shares) || 0);
  const price = Math.max(0, Number(currentPrice) || 0);
  return s * price;
}

/**
 * Calculates profit/loss amount: current value - invested amount
 */
export function calculateHoldingProfitLoss(currentValue: number, investedAmount: number): number {
  const cv = Number(currentValue) || 0;
  const inv = Number(investedAmount) || 0;
  return cv - inv;
}

/**
 * Calculates profit/loss percentage: (profit/loss ÷ invested amount) × 100
 * Handles zero and negative edge cases safely to avoid NaN / Infinity.
 */
export function calculateHoldingProfitLossPercentage(profitLoss: number, investedAmount: number): number {
  const pl = Number(profitLoss) || 0;
  const inv = Number(investedAmount) || 0;

  if (inv <= 0) {
    return 0;
  }

  const percentage = (pl / inv) * 100;
  return Number.isFinite(percentage) ? Number(percentage.toFixed(2)) : 0;
}

/**
 * Calculates holding percentage of current portfolio value: (current value ÷ total portfolio value) × 100
 * Handles zero portfolio value safely to avoid NaN / Infinity.
 */
export function calculateHoldingWeightPercentage(holdingCurrentValue: number, totalPortfolioValue: number): number {
  const hcv = Math.max(0, Number(holdingCurrentValue) || 0);
  const tpv = Math.max(0, Number(totalPortfolioValue) || 0);

  if (tpv <= 0) {
    return 0;
  }

  const weight = (hcv / tpv) * 100;
  return Number.isFinite(weight) ? Number(weight.toFixed(2)) : 0;
}

/**
 * Calculates complete analytics for a single stock holding
 */
export function calculateHoldingAnalytics(
  holding: StockHolding,
  totalPortfolioValue: number = 0
): HoldingAnalytics {
  const shares = Number(holding.shares ?? holding.units) || 0;
  const avgPrice = Number(holding.averagePurchasePrice ?? holding.buyPrice) || 0;
  const currentPrice = Number(holding.currentPrice) || 0;

  const investedAmount = calculateHoldingInvested(shares, avgPrice);
  const currentValue = calculateHoldingCurrentValue(shares, currentPrice);
  const profitLoss = calculateHoldingProfitLoss(currentValue, investedAmount);
  const profitLossPercentage = calculateHoldingProfitLossPercentage(profitLoss, investedAmount);
  const portfolioWeightPercentage = calculateHoldingWeightPercentage(currentValue, totalPortfolioValue);

  return {
    id: holding.id || `holding-${holding.symbol}-${Math.random().toString(36).substr(2, 9)}`,
    symbol: (holding.symbol || '').toUpperCase().trim(),
    companyName: holding.companyName || holding.symbol,
    shares,
    averagePurchasePrice: avgPrice,
    currentPrice,
    investedAmount,
    currentValue,
    profitLoss,
    profitLossPercentage,
    portfolioWeightPercentage,
    sector: holding.sector,
  };
}

/**
 * Calculates aggregated portfolio analytics summary
 */
export function calculatePortfolioAnalytics(holdings: StockHolding[]): PortfolioAnalyticsSummary {
  const rawList = Array.isArray(holdings) ? holdings : [];

  // Step 1: Calculate total invested and total current value
  let totalInvested = 0;
  let totalCurrentValue = 0;

  const intermediateList = rawList.map((h, index) => {
    const shares = Number(h.shares ?? h.units) || 0;
    const avgPrice = Number(h.averagePurchasePrice ?? h.buyPrice) || 0;
    const currentPrice = Number(h.currentPrice) || 0;

    const invested = calculateHoldingInvested(shares, avgPrice);
    const currVal = calculateHoldingCurrentValue(shares, currentPrice);

    totalInvested += invested;
    totalCurrentValue += currVal;

    return {
      holding: h,
      shares,
      avgPrice,
      currentPrice,
      invested,
      currVal,
      id: h.id || `holding-${h.symbol || index}-${index}`,
    };
  });

  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPercentage =
    totalInvested > 0
      ? Number.isFinite((totalProfitLoss / totalInvested) * 100)
        ? Number(((totalProfitLoss / totalInvested) * 100).toFixed(2))
        : 0
      : 0;

  // Step 2: Compute individual holding analytics with portfolio weights
  const analyzedHoldings: HoldingAnalytics[] = intermediateList.map((item) => {
    const pl = calculateHoldingProfitLoss(item.currVal, item.invested);
    const plPercentage = calculateHoldingProfitLossPercentage(pl, item.invested);
    const weightPercentage = calculateHoldingWeightPercentage(item.currVal, totalCurrentValue);

    return {
      id: item.id,
      symbol: (item.holding.symbol || '').toUpperCase().trim(),
      companyName: item.holding.companyName || item.holding.symbol,
      shares: item.shares,
      averagePurchasePrice: item.avgPrice,
      currentPrice: item.currentPrice,
      investedAmount: item.invested,
      currentValue: item.currVal,
      profitLoss: pl,
      profitLossPercentage: plPercentage,
      portfolioWeightPercentage: weightPercentage,
      sector: item.holding.sector,
    };
  });

  return {
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPercentage,
    holdings: analyzedHoldings,
  };
}

/**
 * Backwards compatibility aliases
 */
export function calculatePortfolioValue(holdings: Array<{ units: number; currentPrice: number }>): number {
  return holdings.reduce((sum, h) => sum + (Number(h.units) || 0) * (Number(h.currentPrice) || 0), 0);
}

export function calculatePortfolioGainLoss(
  holdings: Array<{ units: number; buyPrice: number; currentPrice: number }>
): { totalInvestment: number; currentValue: number; gainLoss: number; gainLossPercentage: number } {
  const totalInvestment = holdings.reduce(
    (sum, h) => sum + (Number(h.units) || 0) * (Number(h.buyPrice) || 0),
    0
  );
  const currentValue = holdings.reduce(
    (sum, h) => sum + (Number(h.units) || 0) * (Number(h.currentPrice) || 0),
    0
  );
  const gainLoss = currentValue - totalInvestment;
  const gainLossPercentage =
    totalInvestment > 0 ? Number(((gainLoss / totalInvestment) * 100).toFixed(2)) : 0;

  return {
    totalInvestment,
    currentValue,
    gainLoss,
    gainLossPercentage,
  };
}
