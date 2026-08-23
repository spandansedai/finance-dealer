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

export interface StockHolding {
  symbol: string;
  companyName: string;
  units: number;
  buyPrice: number;
  currentPrice: number;
  sector?: string;
}
