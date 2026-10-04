/**
 * @file types/finance.ts
 * @description Core TypeScript type definitions and interfaces for Finance-Dealer.
 * Defines models for cash flow transactions, income/expense categories, NEPSE stock holdings,
 * portfolio analytics, and holistic financial summary metrics.
 */

/**
 * Represents a single key performance indicator (KPI) metric displayed on dashboard cards.
 */
export interface FinancialMetric {
  /** Display label for the metric (e.g., "Monthly Income") */
  label: string;
  /** Numerical value of the metric */
  amount: number;
  /** Currency symbol or prefix (default: "Rs.") */
  currency: string;
  /** Optional percentage change compared to a previous period */
  changePercentage?: number;
  /** Visual direction indicator for trends */
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Summary breakdown of monthly and projected annual savings metrics.
 */
export interface SavingsSummary {
  /** Total monthly income inflows */
  monthlyIncome: number;
  /** Total monthly expense outflows */
  monthlyExpenses: number;
  /** Net monthly savings surplus or deficit (Income - Expenses) */
  monthlySavings: number;
  /** Percentage of income saved ((Savings / Income) * 100) */
  savingsRate: number;
  /** Projected annual savings capacity (Monthly Savings * 12) */
  annualSavings: number;
}

/**
 * Cash flow movement direction.
 */
export type TransactionType = 'income' | 'expense';

/**
 * Standard income classification categories.
 */
export type IncomeCategory =
  | 'Salary'
  | 'Side Hustle'
  | 'Bonus / Allowance'
  | 'Dividend & Returns'
  | 'Freelance'
  | 'Other Income';

/**
 * Standard expense classification categories.
 */
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

/**
 * Union of all predefined and custom transaction categories.
 */
export type TransactionCategory = IncomeCategory | ExpenseCategory | string;

/**
 * Represents an individual cash flow transaction record.
 */
export interface Transaction {
  /** Unique transaction identifier (UUID from Supabase or memory ID in guest mode) */
  id: string;
  /** Transaction classification type */
  type: TransactionType;
  /** Monetary value in NPR */
  amount: number;
  /** Category assigned to this entry */
  category: TransactionCategory;
  /** Human-readable note or description */
  description: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Optional account or wallet associated with this income/expense entry. */
  accountId?: string | null;
  /** Original foreign-currency amount when this was a Dollar Card expense. */
  originalAmount?: number | null;
  originalCurrency?: 'USD' | null;
  /** NPR per USD rate used when the transaction was recorded. */
  exchangeRate?: number | null;
  exchangeRateDate?: string | null;
  exchangeRateStatus?: 'live' | 'stale' | 'manual' | null;
  /** Whether this transaction has been verified against statements and locked against edits. */
  verified?: boolean;
}

/** A user-managed place where money is held or spent from. */
export type AccountType = 'bank' | 'wallet' | 'cash' | 'card' | 'dollar_card' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
}

/** An internal movement between two of the user's accounts; never income or expense. */
export interface AccountTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note: string;
  /** Whether this transfer has been verified against statements. */
  verified?: boolean;
}

/**
 * Dedicated balance adjustment record for reconciling account balances.
 * Targets exactly one account with a signed amount (+/-) and never affects
 * income/expense totals, savings calculations, or insights.
 */
export interface BalanceAdjustment {
  id: string;
  accountId: string;
  /** Signed correction amount in NPR (positive increases balance, negative decreases balance) */
  amount: number;
  date: string;
  note?: string;
  /** Whether this balance adjustment has been verified against bank/wallet records. */
  verified?: boolean;
  createdAt?: string;
}

/**
 * Standalone income item structure (used for granular salary/income streams).
 */
export interface IncomeItem {
  id: string;
  source: string;
  amount: number;
  date: string;
  category?: string;
}

/**
 * Standalone expense item structure.
 */
export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}

/**
 * Base data model for an equity holding in the Nepal Stock Exchange (NEPSE).
 */
export interface StockHolding {
  /** Optional record ID (UUID in Supabase or guest ID) */
  id?: string;
  /** NEPSE stock ticker symbol in uppercase (e.g., "NABIL", "HDL") */
  symbol: string;
  /** Full official corporate entity name */
  companyName: string;
  /** Quantity of shares held */
  shares: number;
  /** Weighted average purchase cost per share in NPR */
  averagePurchasePrice: number;
  /** Latest recorded market trading price per share in NPR */
  currentPrice: number;
  /** Market sector classification (e.g., Commercial Banks, Hydropower) */
  sector?: string;
  /** Alias for shares (legacy backwards compatibility) */
  units?: number;
  /** Alias for averagePurchasePrice (legacy backwards compatibility) */
  buyPrice?: number;
  isLivePrice?: boolean;
  savedPrice?: number;
}

/**
 * Derived analytics for an individual stock position including gain/loss and weight.
 */
export interface HoldingAnalytics {
  /** Unique position identifier */
  id: string;
  /** NEPSE stock ticker symbol */
  symbol: string;
  /** Full corporate entity name */
  companyName: string;
  /** Total number of shares owned */
  shares: number;
  /** Cost basis per share in NPR */
  averagePurchasePrice: number;
  /** Current market price per share in NPR */
  currentPrice: number;
  /** Total capital invested (Shares * Avg Purchase Price) */
  investedAmount: number;
  /** Current valuation at market price (Shares * Current Price) */
  currentValue: number;
  /** Unrealized profit or loss in NPR (Current Value - Invested Amount) */
  profitLoss: number;
  /** Unrealized return percentage ((ProfitLoss / InvestedAmount) * 100) */
  profitLossPercentage: number;
  /** Percentage of total equity portfolio value represented by this position */
  portfolioWeightPercentage: number;
  /** Optional sector classification */
  sector?: string;
  isLivePrice?: boolean;
  savedPrice?: number;
}

/**
 * Aggregated analytics for the user's entire NEPSE equity portfolio.
 */
export interface PortfolioAnalyticsSummary {
  /** Sum of invested capital across all holdings */
  totalInvested: number;
  /** Sum of current market valuations across all holdings */
  totalCurrentValue: number;
  /** Overall portfolio unrealized profit or loss in NPR */
  totalProfitLoss: number;
  /** Overall portfolio return percentage */
  totalProfitLossPercentage: number;
  /** Array of computed analytics for individual holdings */
  holdings: HoldingAnalytics[];
}

/**
 * Comprehensive cross-domain financial overview combining monthly cash flow and equity assets.
 */
export interface OverallFinancialSummary {
  /** Total monthly income */
  monthlyIncome: number;
  /** Total monthly expenses */
  monthlyExpenses: number;
  /** Net monthly savings surplus/deficit */
  monthlySavings: number;
  /** Savings rate percentage */
  savingsRate: number;
  /** Projected 1-year savings capacity */
  annualSavings: number;
  /** Total stock portfolio cost basis */
  totalInvested: number;
  /** Total current stock portfolio valuation */
  totalCurrentValue: number;
  /** Total portfolio unrealized profit/loss */
  totalProfitLoss: number;
  /** Total portfolio return percentage */
  totalProfitLossPercentage: number;
  /** Combined net position: active equity valuation + projected annual savings */
  totalLiquidAndAssets: number;
}

/**
 * Recurring frequency interval for financial summary email dispatches.
 */
export type EmailFrequency = 'weekly' | 'monthly';

/**
 * User preference configuration for automated financial summary emails.
 */
export interface UserEmailPreferences {
  /** UUID of the user in Supabase auth */
  userId: string;
  /** Destination email address */
  email: string;
  /** Whether recurring summary emails are enabled */
  enabled: boolean;
  /** Frequency interval (weekly or monthly) */
  frequency: EmailFrequency;
  /** Timestamp when the last summary report was dispatched */
  lastSentAt?: string | null;
  /** Creation timestamp */
  createdAt?: string;
  /** Last modification timestamp */
  updatedAt?: string;
}

/**
 * Structured dataset passed to the email generator for rendering financial summaries.
 */
export interface SummaryEmailReportData {
  userEmail: string;
  frequency: EmailFrequency;
  reportDate: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  netSavings: number;
  savingsRate: number;
  totalInvested: number;
  totalPortfolioValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  holdings: HoldingAnalytics[];
  topExpenseCategories: Array<{ category: string; amount: number; percentage: number }>;
  hasActivity: boolean;
  appUrl: string;
}

/**
 * Visual/sentiment classification for automated financial observations.
 */
export type InsightType = 'positive' | 'warning' | 'neutral' | 'info';

/**
 * Domain area classification for financial observations.
 */
export type InsightCategory = 'spending' | 'savings' | 'portfolio';

/**
 * Rule-based factual financial observation generated from user's data.
 */
export interface FinancialInsight {
  /** Unique deterministic identifier for the observation */
  id: string;
  /** Sentiment type for styling */
  type: InsightType;
  /** Financial domain category */
  category: InsightCategory;
  /** Short punchy title */
  title: string;
  /** Fact-based observational message derived purely from user's figures */
  message: string;
  /** Optional metric badge or value tag */
  metricTag?: string;
}
