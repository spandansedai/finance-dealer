export interface PortfolioHolding {
  id: string;
  symbol: string;
  companyName: string;
  shares: number;
  averagePurchasePrice: number;
  purchaseDate: string;
}

export interface PortfolioSummary {
  totalHoldings: number;
  totalShares: number;
  totalPortfolioCost: number;
}

export interface HoldingValidationErrors {
  symbol?: string;
  companyName?: string;
  shares?: string;
  averagePurchasePrice?: string;
  purchaseDate?: string;
  general?: string;
}
