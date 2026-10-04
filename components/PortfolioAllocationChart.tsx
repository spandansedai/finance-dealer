/**
 * @file components/PortfolioAllocationChart.tsx
 * @description Interactive pie chart visualization for stock portfolio weight allocation.
 * Uses Recharts to display how individual stock holdings contribute to the total
 * portfolio market value in percentage terms.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { HoldingAnalytics } from '@/types';
import { formatNepaliCurrency } from '@/lib/calculations/finance';

/**
 * Component properties for PortfolioAllocationChart.
 */
interface PortfolioAllocationChartProps {
  /** Enriched stock holdings data including portfolio weight calculations */
  holdings: HoldingAnalytics[];
  /** Total current market value of all stock holdings in the portfolio */
  totalCurrentValue: number;
}

/**
 * Restrained allocation palette drawn from the ledger's own tokens rather than a
 * categorical rainbow — a floor sheet doesn't need eight hues to stay legible.
 * The brand indigo leads, the rest is a neutral ramp plus gain/loss in their
 * normal data-signal role.
 */
const ALLOCATION_COLORS = [
  'var(--khata)',
  'var(--ink-faint)',
  'var(--gain)',
  'var(--ink-soft)',
  'var(--rule-strong)',
  'var(--loss)',
];

/**
 * Renders a doughnut/pie chart showing the percentage distribution of stock holdings.
 *
 * @param props - PortfolioAllocationChartProps
 * @returns A visual breakdown of portfolio diversification.
 */
export const PortfolioAllocationChart: React.FC<PortfolioAllocationChartProps> = ({
  holdings,
  totalCurrentValue,
}) => {
  // Hydration safety: charts only render after client-side mounting to avoid mismatch with SSR
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter out zero-value holdings to ensure meaningful visualization
  const validHoldings = holdings.filter((h) => h.currentValue > 0);
  const isEmpty = validHoldings.length === 0 || totalCurrentValue <= 0;

  /**
   * Transforms raw holding analytics into a format compatible with Recharts Pie.
   */
  const chartData = validHoldings.map((h, idx) => ({
    name: h.symbol,
    fullName: h.companyName,
    value: h.currentValue,
    shares: h.shares,
    percentage: h.portfolioWeightPercentage,
    color: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length],
  }));

  if (!isMounted) {
    return (
      <div className="flex h-56 items-center justify-center sm:h-64">
        <span className="fig fig-sm fig-mute">Reading the floor sheet&hellip;</span>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="empty">
        <div className="empty-mark">[ 0.00% ]</div>
        <p className="empty-title">No equity holdings logged</p>
        <p className="empty-body">
          Add stock holdings to view your NEPSE equity allocation weights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={76}
              paddingAngle={2}
              dataKey="value"
              stroke="var(--rule)"
              strokeWidth={1}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="border border-rule bg-sheet p-2.5 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <span className="h-2 w-2" style={{ backgroundColor: data.color }} />
                        <span className="font-mono">{data.name}</span>
                        <span className="max-w-[120px] truncate text-[10px] font-normal text-ink-faint">
                          {data.fullName}
                        </span>
                      </div>
                      <div className="fig fig-sm mt-1 text-ink-soft">
                        {formatNepaliCurrency(data.value)}
                      </div>
                      <div className="fig fig-sm text-ink-faint">
                        {data.percentage.toFixed(2)}% of holdings
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list, read the way a floor sheet lists its scrips. */}
      <div className="max-h-48 space-y-0 overflow-y-auto border-t border-rule">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-2 border-b border-rule py-2 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0" style={{ backgroundColor: item.color }} />
              <span className="ticker shrink-0">{item.name}</span>
              <span className="truncate text-[11px] text-ink-faint">{item.fullName}</span>
            </div>
            <span className="fig fig-sm shrink-0">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
