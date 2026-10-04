/**
 * @file lib/insights/generateInsights.ts
 * @description Deterministic, rule-based financial insights and observation engine.
 * Evaluates user transactions, savings summaries, and NEPSE portfolio analytics against
 * clearly defined financial thresholds.
 *
 * NOTE: This is a purely factual, math-based observational engine. It never makes
 * price predictions, buy/sell recommendations, tax advice, or legal/financial directives.
 */

import {
  FinancialInsight,
  PortfolioAnalyticsSummary,
  SavingsSummary,
  StockHolding,
  Transaction,
} from '@/types';
import {
  calculateCategoryBreakdown,
  calculatePortfolioAnalytics,
  calculateSavingsSummary,
  calculateTotalByType,
  formatNepaliCurrency,
} from '@/lib/calculations/finance';

/**
 * Named threshold constants for rule-based financial observations.
 * Defined in one central configuration table for straightforward tuning and auditability.
 */
export const INSIGHT_THRESHOLDS = {
  /** Month-over-month category spending increase to trigger a surge observation (%) */
  MOM_SPENDING_INCREASE_PERCENT: 20,
  /** Minimum absolute spend in NPR required before month-over-month increase is flagged */
  MIN_CATEGORY_SPEND_FOR_MOM_ALERT: 1000,
  /** Proportion of total monthly expenses represented by a single category to flag share (%) */
  CATEGORY_EXPENSE_SHARE_PERCENT: 40,
  /** General personal finance baseline for low savings rate benchmark (%) */
  LOW_SAVINGS_RATE_PERCENT: 15,
  /** Baseline for healthy savings rate observation (%) */
  HEALTHY_SAVINGS_RATE_PERCENT: 20,
  /** Benchmark for excellent savings rate observation (%) */
  EXCELLENT_SAVINGS_RATE_PERCENT: 40,
  /** Proportion of total portfolio valuation in a single stock position to flag concentration (%) */
  HOLDING_CONCENTRATION_PERCENT: 30,
  /** Proportion of total portfolio valuation in a single industry sector to flag concentration (%) */
  SECTOR_CONCENTRATION_PERCENT: 40,
  /** Significant unrealized stock capital gain threshold (%) */
  LARGE_UNREALIZED_GAIN_PERCENT: 20,
  /** Significant unrealized stock capital loss threshold (%) */
  LARGE_UNREALIZED_LOSS_PERCENT: -20,
} as const;

/**
 * Parameters for the generateInsights engine.
 */
export interface GenerateInsightsParams {
  /** List of cash flow transactions (income and expense entries) */
  transactions: Transaction[];
  /** Optional pre-computed savings summary */
  savingsSummary?: SavingsSummary;
  /** Optional pre-computed portfolio analytics summary */
  portfolioSummary?: PortfolioAnalyticsSummary;
  /** Optional list of stock holdings (used if portfolioSummary is not supplied) */
  holdings?: StockHolding[];
}

/**
 * Helper to extract unique Year-Month keys ('YYYY-MM') from transactions sorted chronologically.
 */
function getSortedMonthKeys(transactions: Transaction[]): string[] {
  const months = new Set<string>();
  for (const t of transactions) {
    if (t.date && t.date.length >= 7) {
      const ym = t.date.substring(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) {
        months.add(ym);
      }
    }
  }
  return Array.from(months).sort();
}

/**
 * Generates rule-based financial observations from cash flow and investment data.
 *
 * @param params - Dataset containing transactions, savings summary, and portfolio analytics.
 * @returns Array of factual, structured FinancialInsight objects.
 */
export function generateInsights({
  transactions,
  savingsSummary,
  portfolioSummary,
  holdings = [],
}: GenerateInsightsParams): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  const txList = Array.isArray(transactions) ? transactions : [];
  const totalIncome = calculateTotalByType(txList, 'income');
  const totalExpenses = calculateTotalByType(txList, 'expense');

  // Compute or consume savings summary
  const effectiveSavings: SavingsSummary =
    savingsSummary ?? calculateSavingsSummary(totalIncome, totalExpenses);

  // Compute or consume portfolio summary
  const effectivePortfolio: PortfolioAnalyticsSummary =
    portfolioSummary ?? calculatePortfolioAnalytics(holdings);

  /* ==========================================================================
     1. SPENDING & BUDGETING OBSERVATIONS
     ========================================================================== */

  // A. Month-over-Month Category Spending Surges
  const expenseTxs = txList.filter((t) => t.type === 'expense');
  const monthKeys = getSortedMonthKeys(expenseTxs);

  if (monthKeys.length >= 2) {
    const latestMonth = monthKeys[monthKeys.length - 1];
    const prevMonth = monthKeys[monthKeys.length - 2];

    const latestMonthTxs = expenseTxs.filter((t) => t.date.startsWith(latestMonth));
    const prevMonthTxs = expenseTxs.filter((t) => t.date.startsWith(prevMonth));

    const latestBreakdown = calculateCategoryBreakdown(latestMonthTxs, 'expense');
    const prevBreakdown = calculateCategoryBreakdown(prevMonthTxs, 'expense');

    for (const [cat, currAmount] of Object.entries(latestBreakdown)) {
      const prevAmount = prevBreakdown[cat] || 0;
      if (
        prevAmount > 0 &&
        currAmount >= INSIGHT_THRESHOLDS.MIN_CATEGORY_SPEND_FOR_MOM_ALERT
      ) {
        const increasePct = ((currAmount - prevAmount) / prevAmount) * 100;
        if (increasePct >= INSIGHT_THRESHOLDS.MOM_SPENDING_INCREASE_PERCENT) {
          insights.push({
            id: `spending-mom-increase-${cat.toLowerCase().replace(/\s+/g, '-')}`,
            type: 'warning',
            category: 'spending',
            title: `${cat} Spending Surge`,
            message: `${cat} spending is up ${increasePct.toFixed(0)}% vs last month, from ${formatNepaliCurrency(prevAmount)} to ${formatNepaliCurrency(currAmount)}.`,
            metricTag: `+${increasePct.toFixed(0)}% MoM`,
          });
        }
      }
    }
  }

  // B. Outsized Single Category Share
  if (effectiveSavings.monthlyExpenses > 0) {
    const categoryTotals = calculateCategoryBreakdown(txList, 'expense');
    for (const [cat, catAmount] of Object.entries(categoryTotals)) {
      const sharePct = (catAmount / effectiveSavings.monthlyExpenses) * 100;
      if (sharePct >= INSIGHT_THRESHOLDS.CATEGORY_EXPENSE_SHARE_PERCENT) {
        insights.push({
          id: `spending-category-share-${cat.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'neutral',
          category: 'spending',
          title: `High ${cat} Spending Share`,
          message: `${cat} accounts for ${sharePct.toFixed(1)}% of your total logged expenses (${formatNepaliCurrency(catAmount)} of ${formatNepaliCurrency(effectiveSavings.monthlyExpenses)}).`,
          metricTag: `${sharePct.toFixed(1)}% of total expenses`,
        });
      }
    }
  }

  // C. Monthly Cash Flow Deficit
  if (
    effectiveSavings.monthlyExpenses > effectiveSavings.monthlyIncome &&
    effectiveSavings.monthlyExpenses > 0
  ) {
    const deficitAmount =
      effectiveSavings.monthlyExpenses - effectiveSavings.monthlyIncome;
    insights.push({
      id: 'spending-cash-flow-deficit',
      type: 'warning',
      category: 'spending',
      title: 'Monthly Cash Flow Deficit',
      message: `Total monthly expenses (${formatNepaliCurrency(effectiveSavings.monthlyExpenses)}) exceed income (${formatNepaliCurrency(effectiveSavings.monthlyIncome)}) by ${formatNepaliCurrency(deficitAmount)}.`,
      metricTag: `-${formatNepaliCurrency(deficitAmount)} net`,
    });
  }

  /* ==========================================================================
     2. SAVINGS RATE OBSERVATIONS
     ========================================================================== */

  if (effectiveSavings.monthlyIncome > 0) {
    if (
      effectiveSavings.monthlySavings >= 0 &&
      effectiveSavings.savingsRate < INSIGHT_THRESHOLDS.LOW_SAVINGS_RATE_PERCENT
    ) {
      insights.push({
        id: 'savings-rate-below-benchmark',
        type: 'neutral',
        category: 'savings',
        title: 'Savings Rate Below Benchmark',
        message: `Your current savings rate is ${effectiveSavings.savingsRate.toFixed(1)}% (${formatNepaliCurrency(effectiveSavings.monthlySavings)} saved from ${formatNepaliCurrency(effectiveSavings.monthlyIncome)} income). General guidelines often suggest aiming for a 15%–20% savings rate when possible.`,
        metricTag: `${effectiveSavings.savingsRate.toFixed(1)}% rate`,
      });
    } else if (
      effectiveSavings.savingsRate >=
      INSIGHT_THRESHOLDS.EXCELLENT_SAVINGS_RATE_PERCENT
    ) {
      insights.push({
        id: 'savings-rate-excellent',
        type: 'positive',
        category: 'savings',
        title: 'Strong Monthly Savings Rate',
        message: `Your current savings rate of ${effectiveSavings.savingsRate.toFixed(1)}% (${formatNepaliCurrency(effectiveSavings.monthlySavings)} surplus) reflects substantial cash retention for investing.`,
        metricTag: `${effectiveSavings.savingsRate.toFixed(1)}% rate`,
      });
    } else if (
      effectiveSavings.savingsRate >=
      INSIGHT_THRESHOLDS.HEALTHY_SAVINGS_RATE_PERCENT
    ) {
      insights.push({
        id: 'savings-rate-healthy',
        type: 'positive',
        category: 'savings',
        title: 'Healthy Savings Rate',
        message: `Your savings rate of ${effectiveSavings.savingsRate.toFixed(1)}% (${formatNepaliCurrency(effectiveSavings.monthlySavings)} surplus) is above the standard 20% savings benchmark.`,
        metricTag: `${effectiveSavings.savingsRate.toFixed(1)}% rate`,
      });
    }
  }

  /* ==========================================================================
     3. PORTFOLIO OBSERVATIONS
     ========================================================================== */

  const analyzedHoldings = effectivePortfolio.holdings || [];
  const totalValuation = effectivePortfolio.totalCurrentValue;

  if (totalValuation > 0 && analyzedHoldings.length > 0) {
    // A. Single Holding Concentration
    if (analyzedHoldings.length > 1) {
      for (const h of analyzedHoldings) {
        if (
          h.portfolioWeightPercentage >=
          INSIGHT_THRESHOLDS.HOLDING_CONCENTRATION_PERCENT
        ) {
          insights.push({
            id: `portfolio-concentration-${h.symbol.toLowerCase()}`,
            type: 'warning',
            category: 'portfolio',
            title: `${h.symbol} Portfolio Concentration`,
            message: `${h.symbol} accounts for ${h.portfolioWeightPercentage.toFixed(1)}% of your equity portfolio (${formatNepaliCurrency(h.currentValue)} of ${formatNepaliCurrency(totalValuation)}). A high single-holding allocation increases exposure to company-specific fluctuations.`,
            metricTag: `${h.portfolioWeightPercentage.toFixed(1)}% weight`,
          });
        }
      }
    }

    // B. Sector Concentration
    const sectorTotals: Record<string, number> = {};
    for (const h of analyzedHoldings) {
      if (h.sector && h.sector.trim()) {
        const sec = h.sector.trim();
        sectorTotals[sec] = (sectorTotals[sec] || 0) + (h.currentValue || 0);
      }
    }

    const uniqueSectors = Object.keys(sectorTotals);
    if (uniqueSectors.length >= 1) {
      for (const [sec, val] of Object.entries(sectorTotals)) {
        const secShare = (val / totalValuation) * 100;
        if (secShare >= INSIGHT_THRESHOLDS.SECTOR_CONCENTRATION_PERCENT) {
          insights.push({
            id: `portfolio-sector-concentration-${sec.toLowerCase().replace(/\s+/g, '-')}`,
            type: 'neutral',
            category: 'portfolio',
            title: `${sec} Sector Weight`,
            message: `The ${sec} sector represents ${secShare.toFixed(1)}% of your total equity portfolio (${formatNepaliCurrency(val)} of ${formatNepaliCurrency(totalValuation)}).`,
            metricTag: `${secShare.toFixed(1)}% sector`,
          });
        }
      }
    }

    // C. Large Unrealized Gains and Losses
    for (const h of analyzedHoldings) {
      if (h.investedAmount > 0) {
        if (
          h.profitLossPercentage >=
          INSIGHT_THRESHOLDS.LARGE_UNREALIZED_GAIN_PERCENT
        ) {
          insights.push({
            id: `portfolio-gain-${h.symbol.toLowerCase()}`,
            type: 'positive',
            category: 'portfolio',
            title: `Unrealized Gain on ${h.symbol}`,
            message: `${h.symbol} position has an unrealized gain of +${h.profitLossPercentage.toFixed(1)}% (+${formatNepaliCurrency(h.profitLoss)}) against an invested cost basis of ${formatNepaliCurrency(h.investedAmount)}.`,
            metricTag: `+${h.profitLossPercentage.toFixed(1)}%`,
          });
        } else if (
          h.profitLossPercentage <=
          INSIGHT_THRESHOLDS.LARGE_UNREALIZED_LOSS_PERCENT
        ) {
          insights.push({
            id: `portfolio-loss-${h.symbol.toLowerCase()}`,
            type: 'warning',
            category: 'portfolio',
            title: `Unrealized Loss on ${h.symbol}`,
            message: `${h.symbol} position has an unrealized loss of ${h.profitLossPercentage.toFixed(1)}% (${formatNepaliCurrency(h.profitLoss)}) against an invested cost basis of ${formatNepaliCurrency(h.investedAmount)}.`,
            metricTag: `${h.profitLossPercentage.toFixed(1)}%`,
          });
        }
      }
    }
  }

  return insights;
}
