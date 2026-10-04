/**
 * @file components/FinancialInsights.tsx
 * @description Renders rule-based, factual financial observations and nudges.
 * Displays spending spikes, savings benchmarks, and portfolio concentration notes
 * with strict adherence to factual reporting without advising or predicting.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { FinancialInsight, InsightType } from '@/types';

interface FinancialInsightsProps {
  insights: FinancialInsight[];
  hasAnyData: boolean;
}

const TAG_CLASS: Record<InsightType, string> = {
  positive: 'tag tag-gain',
  warning: 'tag tag-warn',
  neutral: 'tag',
  info: 'tag',
};

const CATEGORY_LABELS = {
  spending: 'Spending',
  savings: 'Savings',
  portfolio: 'Portfolio',
};

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({
  insights,
  hasAnyData,
}) => {
  return (
    <section className="sheet">
      <div className="sheet-hd">
        <div>
          <h2 className="sheet-title">
            Observations
          </h2>
          <p className="sheet-sub">
            {insights.length > 0
              ? `${insights.length} ${insights.length === 1 ? 'observation' : 'observations'}`
              : 'Checks derived from your logged records.'}
          </p>
        </div>
      </div>

      <div className="sheet-bd">
        {!hasAnyData ? (
          <div className="empty">
            <div className="empty-mark">[ ledger empty ]</div>
            <p className="empty-title">No financial data logged</p>
            <p className="empty-body">
              Log transactions in the passbook or record NEPSE stock holdings to generate cash
              flow, savings rate, and portfolio concentration checks.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Link href="/expenses" className="btn btn-ink btn-sm">
                Write an entry
              </Link>
              <Link href="/portfolio" className="btn btn-sm">
                Add a holding
              </Link>
            </div>
          </div>
        ) : insights.length === 0 ? (
          <div className="note note-gain">
            <span>
              <span className="tag tag-gain mr-2">Steady</span>
              No unusual spending spikes or extreme portfolio concentration detected. Records are
              currently in a steady baseline.
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="flex flex-col gap-1.5 border-b border-rule py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className={`${TAG_CLASS[insight.type]} mt-0.5 shrink-0`}>
                    {CATEGORY_LABELS[insight.category]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{insight.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">
                      {insight.message}
                    </span>
                  </span>
                </div>
                {insight.metricTag && (
                  <span className={`${TAG_CLASS[insight.type]} shrink-0 self-start sm:self-auto`}>
                    {insight.metricTag}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sheet-ft">
        Automated, rule-based observations derived from your own logged records. Not financial
        advice.
      </div>
    </section>
  );
};
