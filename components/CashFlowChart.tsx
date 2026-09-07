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
import { formatNepaliCurrency } from '@/lib/calculations/finance';

interface CashFlowChartProps {
  income: number;
  expenses: number;
  savings: number;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  income,
  expenses,
  savings,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDeficit = savings < 0;

  const data = [
    {
      category: 'Income',
      amount: Math.max(0, income),
      fill: '#10b981', // emerald-500
      label: 'Monthly Inflow',
    },
    {
      category: 'Expenses',
      amount: Math.max(0, expenses),
      fill: '#f43f5e', // rose-500
      label: 'Monthly Outflow',
    },
    {
      category: isDeficit ? 'Deficit' : 'Savings',
      amount: Math.abs(savings),
      fill: isDeficit ? '#e11d48' : '#3b82f6', // rose-600 or blue-500
      label: isDeficit ? 'Monthly Shortfall' : 'Net Monthly Surplus',
    },
  ];

  const isEmpty = income === 0 && expenses === 0 && savings === 0;

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
        <div className="text-2xl mb-2">📉</div>
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          No Cash Flow Data
        </p>
        <p className="text-[11px] text-zinc-400 max-w-xs mt-1">
          Add your monthly income and expenses to view your cash flow breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-56 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis
              dataKey="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#71717a' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#71717a' }}
              tickFormatter={(val) =>
                val >= 100000
                  ? `${(val / 100000).toFixed(1)}L`
                  : val >= 1000
                  ? `${(val / 1000).toFixed(0)}k`
                  : `${val}`
              }
            />
            <Tooltip
              cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0].payload;
                  return (
                    <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg text-xs space-y-1">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: entry.fill }}
                        />
                        <span>{entry.label}</span>
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-300 font-mono">
                        Amount:{' '}
                        <strong>
                          {entry.category === 'Deficit' ? '-' : ''}
                          {formatNepaliCurrency(entry.amount)}
                        </strong>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={48}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
        <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 block">Inflow</span>
          <span className="text-[11px] sm:text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate block">
            {formatNepaliCurrency(income)}
          </span>
        </div>
        <div className="p-1.5 sm:p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 block">Outflow</span>
          <span className="text-[11px] sm:text-xs font-bold font-mono text-rose-600 dark:text-rose-400 truncate block">
            {formatNepaliCurrency(expenses)}
          </span>
        </div>
        <div className={`p-1.5 sm:p-2 rounded-lg ${isDeficit ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-500/5 border-blue-500/10'}`}>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 block">{isDeficit ? 'Deficit' : 'Surplus'}</span>
          <span className={`text-[11px] sm:text-xs font-bold font-mono ${isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'} truncate block`}>
            {formatNepaliCurrency(savings)}
          </span>
        </div>
      </div>
    </div>
  );
};
