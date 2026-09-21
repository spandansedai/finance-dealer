/**
 * @file lib/calculations/finance.ts
 * @description Pure calculation engine for Nepali Personal Finance & NEPSE OS.
 * Contains stateless mathematical utilities for computing monthly savings, savings rates,
 * portfolio valuation, cost basis, profit/loss metrics, and aggregate financial summaries.
 */

import {
  Account,
  AccountTransfer,
  BalanceAdjustment,
  HoldingAnalytics,
  OverallFinancialSummary,
  PortfolioAnalyticsSummary,
  SavingsSummary,
  StockHolding,
  Transaction,
  TransactionType,
} from '@/types';

/* ==========================================================================\n   Cash Flow & Savings Calculations\n   ========================================================================== */

/**
 * Calculates monthly net savings (surplus or deficit).
 *
 * @param monthlyIncome - Total income inflows in NPR for the month.
 * @param monthlyExpenses - Total expense outflows in NPR for the month.
 * @returns Net savings surplus (positive) or deficit (negative) in NPR.
 */
export function calculateMonthlySavings(monthlyIncome: number, monthlyExpenses: number): number {
  const income = Number(monthlyIncome) || 0;
  const expenses = Number(monthlyExpenses) || 0;
  return income - expenses;
}

/**
 * Alias for calculateMonthlySavings provided for backwards compatibility.
 *
 * @param totalIncome - Total income inflows in NPR.
 * @param totalExpenses - Total expense outflows in NPR.
 * @returns Net savings in NPR.
 */
export function calculateNetSavings(totalIncome: number, totalExpenses: number): number {
  return calculateMonthlySavings(totalIncome, totalExpenses);
}

/**
 * Calculates the savings rate percentage: (monthlySavings / monthlyIncome) * 100.
 *
 * Edge cases handled:
 * - If monthlyIncome <= 0, returns 0 to prevent division by zero, NaN, or Infinity.
 * - Negative savings return negative savings rate percentage rounded to 2 decimal places.
 *
 * @param monthlyIncome - Total monthly income in NPR.
 * @param monthlyExpenses - Total monthly expenses in NPR.
 * @returns Savings rate as a percentage rounded to 2 decimal places (e.g., 25.5 for 25.5%).
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
 * Projects annual savings capacity assuming current monthly savings rate continues for 12 months.
 *
 * @param monthlySavings - Monthly net savings in NPR.
 * @returns Projected annual savings in NPR (monthlySavings * 12).
 */
export function calculateAnnualSavings(monthlySavings: number): number {
  const savings = Number(monthlySavings) || 0;
  return savings * 12;
}

/**
 * Calculates a consolidated savings breakdown summary object.
 *
 * @param monthlyIncome - Total monthly income in NPR.
 * @param monthlyExpenses - Total monthly expenses in NPR.
 * @returns A structured SavingsSummary containing income, expenses, net savings, savings rate, and annual savings.
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
 * Formats a numerical amount into Nepali Rupees (NPR) string using standard South Asian numbering convention.
 *
 * @param amount - The numeric monetary value to format.
 * @param prefix - Currency symbol/prefix to prepend (default: 'Rs. ').
 * @returns Formatted currency string (e.g. "Rs. 1,50,000" or "-Rs. 25,000").
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

/**
 * Sums up transaction amounts matching a given transaction type ('income' or 'expense').
 *
 * @param transactions - List of transaction records.
 * @param type - Classification filter ('income' or 'expense').
 * @returns Total aggregate sum in NPR.
 */
export function calculateTotalByType(transactions: Transaction[], type: TransactionType): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/**
 * Groups and sums transactions by category for a specific transaction type.
 *
 * @param transactions - List of transaction records.
 * @param type - Classification filter ('income' or 'expense').
 * @returns Map of category name to total spent/received in NPR.
 */
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
   Live Account Balance Calculation Engine
   ========================================================================== */

/**
 * Derives live account balances by summing transactions, transfers, and dedicated balance adjustments.
 * Balances are never statically stored; they are always dynamically derived.
 *
 * Formula per account:
 *   Balance = (Sum of linked Income Transactions - Sum of linked Expense Transactions)
 *           + (Sum of Transfers IN - Sum of Transfers OUT)
 *           + (Sum of Balance Adjustments)
 *
 * @param accounts - Array of user accounts.
 * @param transactions - Array of income and expense transactions.
 * @param transfers - Array of internal account transfers.
 * @param adjustments - Array of dedicated balance adjustments.
 * @returns Map of account ID to live balance in NPR (rounded to 2 decimal places).
 */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  transfers: AccountTransfer[],
  adjustments: BalanceAdjustment[] = []
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const account of accounts) {
    balances[account.id] = 0;
  }

  for (const tx of transactions) {
    if (tx.accountId && tx.accountId in balances) {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        balances[tx.accountId] += amount;
      } else if (tx.type === 'expense') {
        balances[tx.accountId] -= amount;
      }
    }
  }

  for (const transfer of transfers) {
    const amount = Number(transfer.amount) || 0;
    if (transfer.fromAccountId in balances) {
      balances[transfer.fromAccountId] -= amount;
    }
    if (transfer.toAccountId in balances) {
      balances[transfer.toAccountId] += amount;
    }
  }

  for (const adj of adjustments) {
    const amount = Number(adj.amount) || 0;
    if (adj.accountId in balances) {
      balances[adj.accountId] += amount;
    }
  }

  for (const id of Object.keys(balances)) {
    balances[id] = Number(balances[id].toFixed(2));
  }

  return balances;
}

/**
 * Derives the live balance of a single account from its linked transactions, transfers, and adjustments.
 *
 * @param accountId - Target account identifier.
 * @param transactions - Array of income and expense transactions.
 * @param transfers - Array of internal account transfers.
 * @param adjustments - Array of dedicated balance adjustments.
 * @returns Live balance in NPR rounded to 2 decimal places.
 */
export function calculateAccountBalance(
  accountId: string,
  transactions: Transaction[],
  transfers: AccountTransfer[],
  adjustments: BalanceAdjustment[] = []
): number {
  let balance = 0;

  for (const tx of transactions) {
    if (tx.accountId === accountId) {
      const amount = Number(tx.amount) || 0;
      balance += tx.type === 'income' ? amount : -amount;
    }
  }

  for (const transfer of transfers) {
    const amount = Number(transfer.amount) || 0;
    if (transfer.fromAccountId === accountId) {
      balance -= amount;
    }
    if (transfer.toAccountId === accountId) {
      balance += amount;
    }
  }

  for (const adj of adjustments) {
    if (adj.accountId === accountId) {
      balance += Number(adj.amount) || 0;
    }
  }

  return Number(balance.toFixed(2));
}

/* ==========================================================================\n   Portfolio Analytics Pure Calculation Engine\n   ========================================================================== */

/**
 * Calculates the total cost basis for a stock position: shares * average purchase price.
 * Clamps negative inputs to 0.
 *
 * @param shares - Number of shares owned.
 * @param averagePurchasePrice - Average purchase price per share in NPR.
 * @returns Total invested capital in NPR.
 */
export function calculateHoldingInvested(shares: number, averagePurchasePrice: number): number {
  const s = Math.max(0, Number(shares) || 0);
  const price = Math.max(0, Number(averagePurchasePrice) || 0);
  return s * price;
}

/**
 * Calculates current market valuation for a stock position: shares * current market price.
 * Clamps negative inputs to 0.
 *
 * @param shares - Number of shares owned.
 * @param currentPrice - Current market price per share in NPR.
 * @returns Total current valuation in NPR.
 */
export function calculateHoldingCurrentValue(shares: number, currentPrice: number): number {
  const s = Math.max(0, Number(shares) || 0);
  const price = Math.max(0, Number(currentPrice) || 0);
  return s * price;
}

/**
 * Calculates unrealized profit or loss for a stock position: currentValue - investedAmount.
 *
 * @param currentValue - Current valuation in NPR.
 * @param investedAmount - Total invested capital in NPR.
 * @returns Net profit (positive) or loss (negative) in NPR.
 */
export function calculateHoldingProfitLoss(currentValue: number, investedAmount: number): number {
  const cv = Number(currentValue) || 0;
  const inv = Number(investedAmount) || 0;
  return cv - inv;
}

/**
 * Calculates unrealized return percentage: (profitLoss / investedAmount) * 100.
 * Handles zero and negative invested amounts safely to avoid NaN / Infinity.
 *
 * @param profitLoss - Net profit or loss in NPR.
 * @param investedAmount - Total invested capital in NPR.
 * @returns Return percentage rounded to 2 decimal places.
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
 * Calculates the proportion of a single holding relative to the total portfolio value:
 * (holdingCurrentValue / totalPortfolioValue) * 100.
 *
 * @param holdingCurrentValue - Current market value of the single holding.
 * @param totalPortfolioValue - Aggregate current market value of all holdings.
 * @returns Portfolio allocation weight percentage rounded to 2 decimal places.
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
 * Derives comprehensive financial analytics for a single stock holding position.
 *
 * @param holding - Stock holding record.
 * @param totalPortfolioValue - Optional total portfolio value for weight % calculation.
 * @returns HoldingAnalytics object with invested capital, valuation, P/L, return %, and weight.
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
    isLivePrice: holding.isLivePrice,
    savedPrice: holding.savedPrice,
  };
}

/**
 * Computes aggregated portfolio analytics across all stock holdings.
 * Calculates total cost basis, current portfolio valuation, overall unrealized profit/loss,
 * total return percentage, and individual position weight allocations.
 *
 * @param holdings - Array of raw or stored stock holdings.
 * @returns PortfolioAnalyticsSummary with portfolio-wide totals and enriched individual holding analytics.
 */
export function calculatePortfolioAnalytics(holdings: StockHolding[]): PortfolioAnalyticsSummary {
  const rawList = Array.isArray(holdings) ? holdings : [];

  // Step 1: Calculate total invested capital and total current valuation across all positions
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

  // Step 2: Compute individual holding analytics with portfolio allocation weights
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
      isLivePrice: item.holding.isLivePrice,
      savedPrice: item.holding.savedPrice,
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

/* ==========================================================================\n   Cross-Domain Overall Financial Position Engine\n   ========================================================================== */

/**
 * Combines cash flow metrics and stock portfolio analytics into a holistic financial position.
 *
 * @param monthlyIncome - Total monthly income in NPR.
 * @param monthlyExpenses - Total monthly expenses in NPR.
 * @param holdings - Array of stock holdings.
 * @returns An OverallFinancialSummary combining liquid savings rate, portfolio value, and aggregate assets.
 */
export function calculateOverallFinancialSummary(
  monthlyIncome: number,
  monthlyExpenses: number,
  holdings: StockHolding[]
): OverallFinancialSummary {
  const savingsSummary = calculateSavingsSummary(monthlyIncome, monthlyExpenses);
  const portfolioSummary = calculatePortfolioAnalytics(holdings);

  return {
    ...savingsSummary,
    totalInvested: portfolioSummary.totalInvested,
    totalCurrentValue: portfolioSummary.totalCurrentValue,
    totalProfitLoss: portfolioSummary.totalProfitLoss,
    totalProfitLossPercentage: portfolioSummary.totalProfitLossPercentage,
    totalLiquidAndAssets: savingsSummary.annualSavings + portfolioSummary.totalCurrentValue,
  };
}

/* ==========================================================================\n   Backwards Compatibility Helpers\n   ========================================================================== */

/**
 * Calculates aggregate portfolio valuation (legacy helper).
 *
 * @param holdings - Array of units and currentPrice objects.
 * @returns Total portfolio market value in NPR.
 */
export function calculatePortfolioValue(holdings: Array<{ units: number; currentPrice: number }>): number {
  return holdings.reduce((sum, h) => sum + (Number(h.units) || 0) * (Number(h.currentPrice) || 0), 0);
}

/**
 * Calculates aggregate portfolio profit and loss (legacy helper).
 *
 * @param holdings - Array of units, buyPrice, and currentPrice objects.
 * @returns Summary containing total investment, current value, and gain/loss figures.
 */
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
