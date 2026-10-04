/**
 * Nepal resident natural-person income-tax schedule for FY 2083/84 (2026/27).
 *
 * Source: Inland Revenue Department, Government of Nepal, "Economic Act, 2083:
 * Information Booklet on tax exemptions, facilities and other provisions".
 * https://ird.gov.np/content/13632/economic-act--2083---information-booklet-on/
 *
 * This simplified planner applies the published general individual schedule only.
 * Review the current Finance Act before changing these easily editable constants.
 */
export const NEPAL_TAX_FISCAL_YEAR = 'FY 2083/84 (2026/27)';

export interface NepalTaxBracket {
  /** Taxable income included in this marginal band; null means no upper limit. */
  amount: number | null;
  rate: number;
  label: string;
}

export const NEPAL_INDIVIDUAL_TAX_BRACKETS: readonly NepalTaxBracket[] = [
  { amount: 1_000_000, rate: 0.01, label: 'First NPR 1,000,000' },
  { amount: 500_000, rate: 0.1, label: 'Next NPR 500,000' },
  { amount: 1_000_000, rate: 0.2, label: 'Next NPR 1,000,000' },
  { amount: 1_500_000, rate: 0.27, label: 'Next NPR 1,500,000' },
  { amount: null, rate: 0.29, label: 'Remaining income above NPR 4,000,000' },
];
