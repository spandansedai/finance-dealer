export interface FinancialMetric {
  label: string;
  amount: number;
  currency: string;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'neutral';
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
