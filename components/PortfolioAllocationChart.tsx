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
 * Aesthetic color palette used for distinct segments in the pie chart.
 */
const ALLOCATION_COLORS = [
  '#10b981', // emerald-500
  '#6366f1', // indigo-500
  '#f59e0b', // amber-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#8b5cf6', // purple-500
  '#14b8a6', // teal-500
  '#3b82f6', // blue-500
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
      <div className="h-56 sm:h-64 flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-800/20 rounded-xl">
        <span className="text-xs text-zinc-400">Loading chart...</span>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="h-56 sm:h-64 flex flex-col items-center justify-center p-6 text-center bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
        <div className="text-2xl mb-2">📊</div>
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          No Stock Allocation Data
        </p>
        <p className="text-[11px] text-zinc-400 max-w-xs mt-1">
          Add stock holdings with non-zero values to see your portfolio distribution breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-56 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg text-xs space-y-1">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: data.color }}
                        />
                        <span>{data.name}</span>
                        <span className="text-[11px] font-normal text-zinc-400 truncate max-w-[120px]">
                          ({data.fullName})
                        </span>
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-300 font-mono">
                        Valuation: <strong>{formatNepaliCurrency(data.value)}</strong>
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400 font-mono">
                        Allocation: <strong>{data.percentage.toFixed(2)}%</strong> of portfolio
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

      {/* Interactive Legend List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 max-h-48 overflow-y-auto">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {item.name}
              </span>
              <span className="text-[11px] text-zinc-400 truncate max-w-[90px] sm:max-w-[110px]">
                {item.fullName}
              </span>
            </div>
            <div className="text-right shrink-0 ml-2 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              {item.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
