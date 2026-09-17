/**
 * @file components/FinancialInsights.tsx
 * @description Renders rule-based, factual financial observations and nudges.
 * Displays spending spikes, savings benchmarks, and portfolio concentration notes
 * with strict adherence to factual reporting without advising or predicting.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { FinancialInsight } from '@/types';

interface FinancialInsightsProps {
  insights: FinancialInsight[];
  hasAnyData: boolean;
}

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({
  insights,
  hasAnyData,
}) => {
  // Styling maps based on insight type
  const typeContainerStyles = {
    positive:
      'border-emerald-500/25 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200',
    warning:
      'border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/25 text-amber-950 dark:text-amber-200',
    neutral:
      'border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 text-blue-950 dark:text-blue-200',
    info:
      'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-200',
  };

  const badgeStyles = {
    positive:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    neutral:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    info:
      'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  };

  const categoryLabels = {
    spending: 'Spending',
    savings: 'Savings',
    portfolio: 'Portfolio',
  };

  const typeIcons = {
    positive: '✨',
    warning: '⚠️',
    neutral: '📊',
    info: '💡',
  };

  return (
    <section className="p-4 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>💡 Financial Observations</span>
            </h2>
            {insights.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-zinc-700">
                {insights.length} {insights.length === 1 ? 'Observation' : 'Observations'}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Personalized factual observations and spending nudges derived from your own data.
          </p>
        </div>

        {/* Small permanent disclaimer */}
        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic flex items-center gap-1.5 self-start sm:self-auto">
          <span>Automated observations based on your own data, not financial advice.</span>
        </div>
      </div>

      {/* Body: Insights List or Empty State */}
      {!hasAnyData ? (
        <div className="p-6 sm:p-8 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
          <div className="text-2xl">📋</div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No financial data recorded yet
          </p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Add some transactions or stock holdings to start seeing personalized, rule-based observations about your spending habits, savings rate, and portfolio balance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Link
              href="/expenses"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-xs"
            >
              + Log Expenses
            </Link>
            <Link
              href="/portfolio"
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition shadow-xs"
            >
              Add Stock Holding
            </Link>
          </div>
        </div>
      ) : insights.length === 0 ? (
        <div className="p-5 sm:p-6 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 flex items-center gap-3.5">
          <span className="text-xl shrink-0">✅</span>
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">Balanced Financial Baseline</p>
            <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
              No anomalies, sudden spending surges, or concentration thresholds are currently flagged. Your cash flow and portfolio weights appear steady based on your logged records.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {insights.map((insight) => {
            const containerStyle =
              typeContainerStyles[insight.type] || typeContainerStyles.neutral;
            const badgeStyle =
              badgeStyles[insight.type] || badgeStyles.neutral;
            const icon = typeIcons[insight.type] || '📊';

            return (
              <div
                key={insight.id}
                className={`p-4 rounded-xl border ${containerStyle} flex flex-col justify-between gap-2.5 transition shadow-2xs hover:shadow-xs`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      <span>{icon}</span>
                      <span>{categoryLabels[insight.category]}</span>
                    </span>
                    {insight.metricTag && (
                      <span
                        className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle} shrink-0`}
                      >
                        {insight.metricTag}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {insight.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
