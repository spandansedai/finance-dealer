/**
 * @file components/CashFlowChart.tsx
 * @description Responsive Recharts bar chart visualizing monthly cash inflows, outflows,
 * and net surplus / deficit with South Asian currency tooltips and ledger color theming.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { formatNepaliCompact, formatNepaliCurrency } from '@/lib/calculations/finance';

/**
 * Props for CashFlowChart component.
 */
interface CashFlowChartProps {
  /** Monthly total income inflows in NPR */
  income: number;
  /** Monthly total expense outflows in NPR */
  expenses: number;
  /** Net monthly savings (Income - Expenses) in NPR */
  savings: number;
}

/**
 * CashFlowChart renders a grouped comparison of income, expenses, and savings/deficit.
 * Includes client-side mount guards to prevent SSR hydration mismatches with Recharts SVG rendering.
 */
export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  income,
  expenses,
  savings,
}) => {
  // Prevent SSR hydration mismatch with Recharts dynamic canvas/SVG
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDeficit = savings < 0;

  // Transform data points into Recharts bar dataset with the ledger palette
  const data = [
    {
      category: 'Inflow',
      amount: Math.max(0, income),
      fill: 'var(--gain)',
      label: 'Monthly income',
    },
    {
      category: 'Outflow',
      amount: Math.max(0, expenses),
      fill: 'var(--loss)',
      label: 'Monthly expenses',
    },
    {
      category: isDeficit ? 'Deficit' : 'Surplus',
      amount: Math.abs(savings),
      fill: isDeficit ? 'var(--loss)' : 'var(--sayapatri)',
      label: isDeficit ? 'Monthly shortfall' : 'Investable surplus',
    },
  ];

  const isEmpty = income === 0 && expenses === 0 && savings === 0;

  // Placeholder while mounting on client
  if (!isMounted) {
    return (
      <div className="flex h-56 items-center justify-center sm:h-64">
        <span className="fig fig-sm fig-mute">Reading the ledger&hellip;</span>
      </div>
    );
  }

  // Empty state when no income/expense records exist
  if (isEmpty) {
    return (
      <div className="empty">
        <div className="empty-mark">[ 0.00 ]</div>
        <p className="empty-title">No cash flow entries</p>
        <p className="empty-body">
          Record income and expense entries in the ledger to render the cash flow comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="var(--rule)" opacity={0.7} vertical={false} />
            <XAxis
              dataKey="category"
              axisLine={{ stroke: 'var(--rule)' }}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'var(--font-plex-mono)' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--ink-soft)', fontFamily: 'var(--font-plex-mono)' }}
              tickFormatter={(val) => formatNepaliCompact(val)}
            />
            <Tooltip
              cursor={{ fill: 'var(--sheet-alt)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0].payload;
                  return (
                    <div className="border border-rule bg-sheet p-2.5 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <span className="h-2 w-2" style={{ backgroundColor: entry.fill }} />
                        <span>{entry.label}</span>
                      </div>
                      <div className="fig fig-sm mt-1 text-ink-soft">
                        {entry.category === 'Deficit' ? '−' : ''}
                        {formatNepaliCurrency(entry.amount)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amount" radius={0} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-3 gap-2 border-t border-rule pt-3 text-center">
        <div className="border border-rule bg-sheet-alt px-2 py-2">
          <span className="block text-[10px] text-ink-faint">Inflow</span>
          <span className="fig fig-sm fig-gain mt-0.5 block truncate">
            {formatNepaliCurrency(income)}
          </span>
        </div>
        <div className="border border-rule bg-sheet-alt px-2 py-2">
          <span className="block text-[10px] text-ink-faint">Outflow</span>
          <span className="fig fig-sm fig-loss mt-0.5 block truncate">
            {formatNepaliCurrency(expenses)}
          </span>
        </div>
        <div className="border border-rule bg-sheet-alt px-2 py-2">
          <span className="block text-[10px] text-ink-faint">{isDeficit ? 'Deficit' : 'Surplus'}</span>
          <span className={`fig fig-sm mt-0.5 block truncate ${isDeficit ? 'fig-loss' : 'text-sayapatri'}`}>
            {formatNepaliCurrency(savings)}
          </span>
        </div>
      </div>
    </div>
  );
};
