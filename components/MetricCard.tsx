import React from 'react';

interface MetricCardProps {
  label: string;
  amount: number;
  currency?: string;
  changePercentage?: number;
  type?: 'income' | 'expense' | 'savings' | 'neutral';
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  amount,
  currency = 'NPR',
  changePercentage,
  type = 'neutral',
  subtitle,
}) => {
  const formattedAmount = new Intl.NumberFormat('en-NP', {
    maximumFractionDigits: 2,
  }).format(amount);

  const typeStyles = {
    income: 'border-emerald-500/20 bg-emerald-950/10 text-emerald-600 dark:text-emerald-400',
    expense: 'border-rose-500/20 bg-rose-950/10 text-rose-600 dark:text-rose-400',
    savings: 'border-blue-500/20 bg-blue-950/10 text-blue-600 dark:text-blue-400',
    neutral: 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100',
  };

  const badgeStyles = {
    income: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    expense: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    savings: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    neutral: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
  };

  return (
    <div className={`p-6 rounded-2xl border ${typeStyles[type]} shadow-sm transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
        {changePercentage !== undefined && (
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeStyles[type]}`}>
            {changePercentage > 0 ? `+${changePercentage}%` : `${changePercentage}%`}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">{currency}</span>
        <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{formattedAmount}</span>
      </div>
      {subtitle && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
};
