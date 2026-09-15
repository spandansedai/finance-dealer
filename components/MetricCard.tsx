/**
 * @file components/MetricCard.tsx
 * @description Reusable KPI metric card component for displaying monetary figures,
 * percentages, trend badges, and financial health indicators across the dashboard and analytics pages.
 */

import React from 'react';

/**
 * Props for configuring the visual appearance and value display of a MetricCard.
 */
interface MetricCardProps {
  /** Title / label of the metric */
  label: string;
  /** Raw numeric amount in NPR (will be automatically formatted with commas) */
  amount?: number;
  /** Pre-formatted string to display instead of raw number (e.g. "+15.20%") */
  formattedValue?: string;
  /** Currency symbol prefix (default: "Rs.") */
  currency?: string;
  /** Optional percentage change badge text */
  changePercentage?: number;
  /** Custom badge text (e.g. "Profit", "5 Sources", "Cost Basis") */
  badgeText?: string;
  /** Semantic visual styling category */
  type?: 'income' | 'expense' | 'savings' | 'neutral' | 'deficit';
  /** Optional descriptive subtitle explaining how the metric is calculated */
  subtitle?: string;
}

/**
 * MetricCard component renders a single key financial metric with South Asian currency
 * formatting (en-NP), semantic color themes (emerald for income, rose for expenses/deficits, blue for savings),
 * and responsive typography.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  amount,
  formattedValue,
  currency = 'Rs.',
  changePercentage,
  badgeText,
  type = 'neutral',
  subtitle,
}) => {
  const isNegative = amount !== undefined && amount < 0;
  
  // Format numeric values with standard Nepali numbering separators (Lakhs/Crores)
  const displayAmount = formattedValue !== undefined
    ? formattedValue
    : amount !== undefined
      ? (isNegative ? `- ${new Intl.NumberFormat('en-NP', { maximumFractionDigits: 2 }).format(Math.abs(amount))}` : new Intl.NumberFormat('en-NP', { maximumFractionDigits: 2 }).format(amount))
      : '0';

  // Semantic border, background, and text colors based on card type
  const typeStyles = {
    income: 'border-emerald-500/20 bg-emerald-950/10 text-emerald-600 dark:text-emerald-400',
    expense: 'border-rose-500/20 bg-rose-950/10 text-rose-600 dark:text-rose-400',
    savings: 'border-blue-500/20 bg-blue-950/10 text-blue-600 dark:text-blue-400',
    deficit: 'border-rose-500/30 bg-rose-950/15 text-rose-600 dark:text-rose-400',
    neutral: 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100',
  };

  // Badge pill styling to match card type
  const badgeStyles = {
    income: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    expense: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    savings: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    deficit: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    neutral: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
  };

  // Automatically switch savings card to deficit styling when net amount is negative
  const effectiveType = type === 'savings' && isNegative ? 'deficit' : type;

  return (
    <div className={`p-4 sm:p-6 rounded-2xl border ${typeStyles[effectiveType]} shadow-xs transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        {badgeText ? (
          <span className={`text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full ${badgeStyles[effectiveType]}`}>
            {badgeText}
          </span>
        ) : changePercentage !== undefined ? (
          <span className={`text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full ${badgeStyles[effectiveType]}`}>
            {changePercentage > 0 ? `+${changePercentage}%` : `${changePercentage}%`}
          </span>
        ) : null}
      </div>
      <div className="mt-3 sm:mt-4 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
        {currency && (
          <span className="text-xs sm:text-sm font-medium text-zinc-400 dark:text-zinc-500">{currency}</span>
        )}
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 break-words">
          {displayAmount}
        </span>
      </div>
      {subtitle && (
        <p className="mt-1.5 sm:mt-2 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
};
