/**
 * NEPSE market data types and client wrappers
 * Core Rule: Do not query NEPSE APIs directly from the browser UI.
 * (NEPSE = Nepal Stock Exchange. These types describe the shape of data that a
 * server-side integration populates; live prices overlay client views while
 * falling back gracefully to user-saved manual prices.)
 */

/** Snapshot of a single NEPSE-listed stock's trading data for one session. */
export interface NepseStockSummary {
  symbol: string;
  /** Last Traded Price. */
  ltp: number;
  /** Absolute price change vs the previous close. */
  pointChange: number;
  /** Percentage price change vs the previous close. */
  percentageChange: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  /** Number of shares traded. */
  volume: number;
  /** ISO timestamp of when this snapshot was captured. */
  updatedAt: string;
}

/** Snapshot of a NEPSE market index (e.g. the overall NEPSE index). */
export interface NepseIndexSummary {
  index: string;
  currentValue: number;
  change: number;
  percentChange: number;
  /** Total value traded across the index for the session. */
  turnover: number;
}

/** Company name and sector for a single NEPSE-listed symbol. */
export interface NepseCompanyMeta {
  companyName: string;
  sector: string;
}

/** Response shape returned by the internal /api/nepse-prices route. */
export interface NepsePricesApiResponse {
  success?: boolean;
  updatedAt: string | null;
  prices: Record<string, number>;
  /** Company name/sector for symbols traded in the current session, keyed by symbol. */
  meta?: Record<string, NepseCompanyMeta>;
  count?: number;
  cached?: boolean;
  stale?: boolean;
  error?: string;
}
