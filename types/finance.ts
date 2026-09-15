/**
 * Core domain types for the finance app: transactions (income/expense),
 * NEPSE stock holdings, and the calculated summaries derived from them.
 * Calculation logic that consumes these types lives in lib/calculations/finance.ts.
 */

export interface FinancialMetric {
  label: string;
  amount: number;
  currency: string;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'neutral';
}

export interface SavingsSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  annualSavings: number;
}

export type TransactionType = 'income' | 'expense';

export type IncomeCategory =
  | 'Salary'
  | 'Side Hustle'
  | 'Bonus / Allowance'
  | 'Dividend & Returns'
  | 'Freelance'
  | 'Other Income';

export type ExpenseCategory =
  | 'Rent'
  | 'Food & Groceries'
  | 'Utilities'
  | 'Entertainment'
  | 'Transportation'
  | 'Healthcare'
  | 'Shopping'
  | 'Education'
  | 'Other Expense';

export type TransactionCategory = IncomeCategory | ExpenseCategory | string;

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  description: string;
  date: string;
}

export interface IncomeItem {
  id: string;
  source: string;
  amount: number;
  date: string;
  category?: string;
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}

/**
 * A single stock position the user holds on NEPSE.
 * `units`/`buyPrice` are older field names kept for backwards compatibility with
 * earlier data shapes; new code should read/write `shares`/`averagePurchasePrice`
 * instead (see calculateHoldingAnalytics, which falls back to the legacy fields
 * when the newer ones aren't present).
 */
export interface StockHolding {
  id?: string;
  symbol: string;
  companyName: string;
  shares: number;
  averagePurchasePrice: number;
  currentPrice: number;
  sector?: string;
  /** @deprecated legacy alias for `shares` */
  units?: number;
  /** @deprecated legacy alias for `averagePurchasePrice` */
  buyPrice?: number;
  isLivePrice?: boolean;
  savedPrice?: number;
}

export interface HoldingAnalytics {
  id: string;
  symbol: string;
  companyName: string;
  shares: number;
  averagePurchasePrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  portfolioWeightPercentage: number;
  sector?: string;
  isLivePrice?: boolean;
  savedPrice?: number;
}

export interface PortfolioAnalyticsSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  holdings: HoldingAnalytics[];
}

export interface OverallFinancialSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  annualSavings: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  totalLiquidAndAssets: number;
}
