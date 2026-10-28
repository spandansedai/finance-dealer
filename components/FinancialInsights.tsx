/**
 * @file components/FinancialInsights.tsx
 * @description Renders rule-based, factual financial observations and nudges.
 * Displays spending spikes, savings benchmarks, and portfolio concentration notes
 * with strict adherence to factual reporting without advising or predicting.
 */

'use client';

import React from 'react';
import { FinancialInsight, InsightType } from '@/types';
import {
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardSubtitle,
  CardTitle,
  EmptyBody,
  EmptyMark,
  EmptyState,
  EmptyTitle,
  Notice,
  Tag,
} from '@/components/ui';

interface FinancialInsightsProps {
  insights: FinancialInsight[];
  hasAnyData: boolean;
}

const TAG_TONE: Record<InsightType, 'gain' | 'warn' | 'neutral'> = {
  positive: 'gain',
  warning: 'warn',
  neutral: 'neutral',
  info: 'neutral',
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
    <Card as="section">
      <CardHeader>
        <div>
          <CardTitle>
            Observations
          </CardTitle>
          <CardSubtitle>
            {insights.length > 0
              ? `${insights.length} ${insights.length === 1 ? 'observation' : 'observations'}`
              : 'Checks derived from your logged records.'}
          </CardSubtitle>
        </div>
      </CardHeader>

      <CardBody>
        {!hasAnyData ? (
          <EmptyState>
            <EmptyMark>[ ledger empty ]</EmptyMark>
            <EmptyTitle>No financial data logged</EmptyTitle>
            <EmptyBody>
              Log transactions in the passbook or record NEPSE stock holdings to generate cash
              flow, savings rate, and portfolio concentration checks.
            </EmptyBody>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <ButtonLink variant="primary" size="sm" href="/expenses">
                Write an entry
              </ButtonLink>
              <ButtonLink size="sm" href="/portfolio">
                Add a holding
              </ButtonLink>
            </div>
          </EmptyState>
        ) : insights.length === 0 ? (
          <Notice tone="gain">
            <span>
              <Tag tone="gain" className="mr-2">Steady</Tag>
              No unusual spending spikes or extreme portfolio concentration detected. Records are
              currently in a steady baseline.
            </span>
          </Notice>
        ) : (
          <div className="flex flex-col">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="flex flex-col gap-1.5 border-b border-rule py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <Tag tone={TAG_TONE[insight.type]} className="mt-0.5 shrink-0">
                    {CATEGORY_LABELS[insight.category]}
                  </Tag>
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-ink">{insight.title}</span>
                    <span className="mt-0.5 block text-body leading-relaxed text-ink-soft">
                      {insight.message}
                    </span>
                  </span>
                </div>
                {insight.metricTag && (
                  <Tag tone={TAG_TONE[insight.type]} className="shrink-0 self-start sm:self-auto">
                    {insight.metricTag}
                  </Tag>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>

      <CardFooter>
        Automated, rule-based observations derived from your own logged records. Not financial
        advice.
      </CardFooter>
    </Card>
  );
};
