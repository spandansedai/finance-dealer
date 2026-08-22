/**
 * NEPSE market data types and client wrappers
 * Core Rule: Do not query NEPSE APIs directly from the browser UI.
 */

export interface NepseStockSummary {
  symbol: string;
  ltp: number;
  pointChange: number;
  percentageChange: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  updatedAt: string;
}

export interface NepseIndexSummary {
  index: string;
  currentValue: number;
  change: number;
  percentChange: number;
  turnover: number;
}
