/**
 * @file lib/market-data/index.ts
 * @description NEPSE market data models and API wrappers.
 * Architectural rule: Direct client-side browser polling to external NEPSE endpoints is prohibited
 * to protect CORS, latency, and API rate limits. All market data transformations flow through
 * structured interfaces.
 */

/**
 * Summary quote for an individual NEPSE listed company.
 */
export interface NepseStockSummary {
  /** Stock ticker symbol (e.g. "NABIL", "NICA") */
  symbol: string;
  /** Last Traded Price (LTP) in NPR */
  ltp: number;
  /** Absolute point change from previous close */
  pointChange: number;
  /** Percentage change from previous close */
  percentageChange: number;
  /** Opening trading price for the session */
  openPrice: number;
  /** Session high price */
  highPrice: number;
  /** Session low price */
  lowPrice: number;
  /** Total volume of shares traded */
  volume: number;
  /** ISO timestamp of the quote update */
  updatedAt: string;
}

/**
 * Summary for NEPSE benchmark or sector indices (e.g. NEPSE Index, Banking Index).
 */
export interface NepseIndexSummary {
  /** Name or identifier of the index */
  index: string;
  /** Current index value in points */
  currentValue: number;
  /** Absolute point change */
  change: number;
  /** Percentage change */
  percentChange: number;
  /** Total market turnover in NPR */
  turnover: number;
}
