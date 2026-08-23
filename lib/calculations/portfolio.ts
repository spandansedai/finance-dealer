import { HoldingValidationErrors, PortfolioHolding, PortfolioSummary } from '@/types/portfolio';

/**
 * Pure calculation functions for manual stock portfolio cost basis tracking.
 * Note: Does not connect to live market APIs or calculate P&L without real-time market data.
 */

/**
 * Calculates total invested amount for a single holding:
 * totalInvested = numberOfShares * averagePurchasePrice
 */
export function calculateHoldingInvestedAmount(shares: number, averagePurchasePrice: number): number {
  const safeShares = Number(shares) || 0;
  const safePrice = Number(averagePurchasePrice) || 0;
  if (safeShares <= 0 || safePrice <= 0) return 0;
  return Number((safeShares * safePrice).toFixed(2));
}

/**
 * Calculates total portfolio cost:
 * totalPortfolioCost = sum of totalInvested for all holdings
 */
export function calculateTotalPortfolioCost(holdings: PortfolioHolding[]): number {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return 0;
  }
  const total = holdings.reduce((sum, h) => {
    return sum + calculateHoldingInvestedAmount(h.shares, h.averagePurchasePrice);
  }, 0);
  return Number(total.toFixed(2));
}

/**
 * Calculates aggregate summary for a portfolio
 */
export function calculatePortfolioSummary(holdings: PortfolioHolding[]): PortfolioSummary {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return {
      totalHoldings: 0,
      totalShares: 0,
      totalPortfolioCost: 0,
    };
  }

  const totalShares = holdings.reduce((sum, h) => sum + (Number(h.shares) || 0), 0);
  const totalPortfolioCost = calculateTotalPortfolioCost(holdings);

  return {
    totalHoldings: holdings.length,
    totalShares,
    totalPortfolioCost,
  };
}

/**
 * Validates manual stock holding form inputs
 */
export function validateHoldingInput(input: {
  symbol: string;
  companyName: string;
  shares: string | number;
  averagePurchasePrice: string | number;
  purchaseDate: string;
}): {
  isValid: boolean;
  errors: HoldingValidationErrors;
  parsed?: {
    symbol: string;
    companyName: string;
    shares: number;
    averagePurchasePrice: number;
    purchaseDate: string;
  };
} {
  const errors: HoldingValidationErrors = {};

  const cleanSymbol = (input.symbol || '').trim().toUpperCase();
  const cleanCompany = (input.companyName || '').trim();
  const rawShares = typeof input.shares === 'string' ? parseFloat(input.shares) : Number(input.shares);
  const rawPrice =
    typeof input.averagePurchasePrice === 'string'
      ? parseFloat(input.averagePurchasePrice)
      : Number(input.averagePurchasePrice);
  const cleanDate = (input.purchaseDate || '').trim();

  // 1. Stock symbol cannot be empty
  if (!cleanSymbol) {
    errors.symbol = 'Stock symbol cannot be empty.';
  }

  // 2. Company name cannot be empty
  if (!cleanCompany) {
    errors.companyName = 'Company name cannot be empty.';
  }

  // 3. Number of shares must be greater than 0
  if (isNaN(rawShares) || rawShares <= 0) {
    errors.shares = 'Number of shares must be greater than 0.';
  }

  // 4. Average purchase price must be greater than 0
  if (isNaN(rawPrice) || rawPrice <= 0) {
    errors.averagePurchasePrice = 'Average purchase price must be greater than 0.';
  }

  // 5. Purchase date must be valid
  if (!cleanDate) {
    errors.purchaseDate = 'Purchase date is required.';
  } else {
    const parsedTime = Date.parse(cleanDate);
    if (isNaN(parsedTime)) {
      errors.purchaseDate = 'Please enter a valid purchase date.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    parsed: isValid
      ? {
          symbol: cleanSymbol,
          companyName: cleanCompany,
          shares: rawShares,
          averagePurchasePrice: rawPrice,
          purchaseDate: cleanDate,
        }
      : undefined,
  };
}
