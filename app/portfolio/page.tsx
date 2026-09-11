'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MetricCard } from '@/components/MetricCard';
import { StockHolding } from '@/types';
import {
  calculatePortfolioAnalytics,
  formatNepaliCurrency,
} from '@/lib/calculations/finance';
import { supabase } from '@/lib/supabase';
import { useGuestMode } from '@/context/GuestModeContext';

const rowToHolding = (row: any): StockHolding => ({
  id: row.id,
  symbol: (row.symbol || '').toUpperCase(),
  companyName: row.company_name ?? row.companyName ?? row.symbol,
  shares: Number(row.shares ?? row.units ?? 0),
  averagePurchasePrice: Number(
    row.average_purchase_price ?? row.averagePurchasePrice ?? row.buy_price ?? row.buyPrice ?? 0
  ),
  currentPrice: Number(row.current_price ?? row.currentPrice ?? 0),
  sector: row.sector ?? undefined,
});

export default function PortfolioPage() {
  const {
    guestHoldings,
    addGuestHolding,
    updateGuestHoldingPrice,
    deleteGuestHolding,
    clearGuestHoldings,
  } = useGuestMode();

  const [dbHoldings, setDbHoldings] = useState<StockHolding[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auth + data loading state
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingHoldings, setLoadingHoldings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form State
  const [symbol, setSymbol] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [averagePurchasePrice, setAveragePurchasePrice] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inline Current Price Editing State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPriceInput, setTempPriceInput] = useState<string>('');

  const loadHoldings = async () => {
    setLoadingHoldings(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('holdings')
      .select('*');

    if (error) {
      setLoadError('Could not load your stock holdings. Please try refreshing the page.');
      setLoadingHoldings(false);
      return;
    }

    setDbHoldings((data ?? []).map(rowToHolding));
    setLoadingHoldings(false);
  };

  // Check auth session, then load this user's holdings from Supabase.
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;

      const currentUserId = data.user?.id ?? null;
      setUserId(currentUserId);
      setAuthChecked(true);

      if (currentUserId) {
        await loadHoldings();
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);
      if (currentUserId) {
        await loadHoldings();
      } else {
        setDbHoldings([]);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Active holdings set (Supabase if authenticated, in-memory if guest)
  const activeHoldings = userId ? dbHoldings : guestHoldings;

  // Run pure calculations
  const portfolioSummary = calculatePortfolioAnalytics(activeHoldings);
  const {
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    totalProfitLossPercentage,
    holdings: analyzedHoldings,
  } = portfolioSummary;

  const isOverallProfit = totalProfitLoss > 0;
  const isOverallLoss = totalProfitLoss < 0;

  // Add new holding handler
  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) {
      setFormError('Please enter a valid stock symbol (e.g. NABIL).');
      return;
    }

    const parsedShares = parseFloat(shares);
    if (!parsedShares || isNaN(parsedShares) || parsedShares <= 0) {
      setFormError('Please enter a valid number of shares greater than 0.');
      return;
    }

    const parsedAvgPrice = parseFloat(averagePurchasePrice);
    if (isNaN(parsedAvgPrice) || parsedAvgPrice < 0) {
      setFormError('Please enter a valid average purchase price (Rs. >= 0).');
      return;
    }

    const parsedCurrentPrice = parseFloat(currentPrice);
    if (isNaN(parsedCurrentPrice) || parsedCurrentPrice < 0) {
      setFormError('Please enter a valid current price (Rs. >= 0).');
      return;
    }

    const finalCompanyName = companyName.trim() || `${cleanSymbol} Security`;

    if (userId) {
      setSubmitting(true);

      const { data, error } = await supabase
        .from('holdings')
        .insert({
          user_id: userId,
          symbol: cleanSymbol,
          company_name: finalCompanyName,
          shares: parsedShares,
          average_purchase_price: parsedAvgPrice,
          current_price: parsedCurrentPrice,
        })
        .select()
        .single();

      setSubmitting(false);

      if (error || !data) {
        setFormError('Could not save the holding. Please try again.');
        return;
      }

      setDbHoldings((prev) => [rowToHolding(data), ...prev]);
    } else {
      // Guest mode
      addGuestHolding({
        symbol: cleanSymbol,
        companyName: finalCompanyName,
        shares: parsedShares,
        averagePurchasePrice: parsedAvgPrice,
        currentPrice: parsedCurrentPrice,
      });
    }

    // Reset Form
    setSymbol('');
    setCompanyName('');
    setShares('');
    setAveragePurchasePrice('');
    setCurrentPrice('');
    setFormError(null);
  };

  // Delete Holding
  const handleDeleteHolding = async (id?: string) => {
    if (!id) return;

    if (userId) {
      const { error } = await supabase.from('holdings').delete().eq('id', id);

      if (error) {
        setLoadError('Could not delete that holding. Please try again.');
        return;
      }

      setDbHoldings((prev) => prev.filter((h) => h.id !== id));
    } else {
      deleteGuestHolding(id);
    }
  };

  // Start inline price edit
  const handleStartPriceEdit = (id: string, currentVal: number) => {
    setEditingPriceId(id);
    setTempPriceInput(currentVal.toString());
  };

  // Save inline price edit
  const handleSavePriceEdit = async (id: string) => {
    const parsed = parseFloat(tempPriceInput);
    if (!isNaN(parsed) && parsed >= 0) {
      if (userId) {
        const { error } = await supabase
          .from('holdings')
          .update({ current_price: parsed })
          .eq('id', id);

        if (error) {
          setLoadError('Could not update stock price. Please try again.');
          return;
        }

        setDbHoldings((prev) =>
          prev.map((h) => (h.id === id ? { ...h, currentPrice: parsed } : h))
        );
      } else {
        updateGuestHoldingPrice(id, parsed);
      }
    }
    setEditingPriceId(null);
    setTempPriceInput('');
  };

  // Cancel inline price edit
  const handleCancelPriceEdit = () => {
    setEditingPriceId(null);
    setTempPriceInput('');
  };

  const handleClearAll = async () => {
    if (userId) {
      const { error } = await supabase.from('holdings').delete().eq('user_id', userId);

      if (error) {
        setLoadError('Could not clear your holdings. Please try again.');
        return;
      }

      setDbHoldings([]);
    } else {
      clearGuestHoldings();
    }
  };

  // Filtered Holdings
  const filteredHoldings = analyzedHoldings.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.symbol.toLowerCase().includes(q) ||
      item.companyName.toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {loadError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
            {loadError}
          </div>
        )}
        {loadingHoldings && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Loading holdings...</div>
        )}

        {/* Guest Mode Notice Banner */}
        {!userId && authChecked && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wide shrink-0">
                Try It Out Mode
              </span>
              <span>
                Managing portfolio in <strong>Guest Mode</strong>. Stock holdings are stored in memory and will reset when you refresh.
              </span>
            </div>
            <Link
              href="/login"
              className="px-3 py-1 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition self-start sm:self-auto shrink-0 shadow-xs"
            >
              Sign Up / Sign In to Save
            </Link>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                NEPSE Portfolio Analytics
              </h1>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                v0.6 Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Track stock holdings, manually entered current prices, invested capital, current valuation, and profit/loss metrics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-xs"
            >
              <span>←</span>
              <span>Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Portfolio Summary Metrics (Totals) */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Portfolio Totals &amp; Performance
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Calculations computed from your {activeHoldings.length} stock {activeHoldings.length === 1 ? 'holding' : 'holdings'}.
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
              Currency: NPR (Rs.)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Invested */}
            <MetricCard
              label="Total Invested"
              amount={totalInvested}
              currency="Rs."
              type="neutral"
              badgeText="Cost Basis"
              subtitle="Sum of shares × purchase price"
            />

            {/* 2. Total Current Value */}
            <MetricCard
              label="Total Current Value"
              amount={totalCurrentValue}
              currency="Rs."
              type="neutral"
              badgeText={`${activeHoldings.length} Stocks`}
              subtitle="Sum of shares × current price"
            />

            {/* 3. Total Profit / Loss */}
            <MetricCard
              label="Total Profit / Loss"
              amount={totalProfitLoss}
              currency="Rs."
              type={isOverallLoss ? 'deficit' : isOverallProfit ? 'income' : 'neutral'}
              badgeText={
                isOverallProfit
                  ? 'Profit'
                  : isOverallLoss
                  ? 'Loss'
                  : 'Break-even'
              }
              subtitle={
                isOverallProfit
                  ? 'Unrealized net gains'
                  : isOverallLoss
                  ? 'Unrealized net loss'
                  : 'No net gain or loss'
              }
            />

            {/* 4. Total Profit / Loss % */}
            <MetricCard
              label="Total Return %"
              formattedValue={
                totalInvested > 0
                  ? `${totalProfitLossPercentage >= 0 ? '+' : ''}${totalProfitLossPercentage.toFixed(2)}%`
                  : '0.00%'
              }
              currency=""
              type={isOverallLoss ? 'deficit' : isOverallProfit ? 'income' : 'neutral'}
              badgeText={
                totalInvested <= 0
                  ? 'No Investment'
                  : totalProfitLossPercentage > 0
                  ? `+${totalProfitLossPercentage.toFixed(2)}%`
                  : `${totalProfitLossPercentage.toFixed(2)}%`
              }
              subtitle="Overall return on invested capital"
            />
          </div>
        </section>

        {/* Main Content: Add Stock Holding Form + Holdings Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Add Stock Holding Form */}
          <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Add Stock Holding {!userId && <span className="text-xs font-normal text-amber-600 dark:text-amber-400">(Guest Mode)</span>}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Record your shares, purchase price, and current market price.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddHolding} className="space-y-4">
              {/* Symbol */}
              <div>
                <label htmlFor="symbol" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Stock Symbol (NEPSE Ticker) *
                </label>
                <input
                  id="symbol"
                  type="text"
                  placeholder="e.g. NABIL, GBIME, HDL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm font-semibold uppercase text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                />
              </div>

              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Company Name (Optional)
                </label>
                <input
                  id="companyName"
                  type="text"
                  placeholder="e.g. Nabil Bank Limited"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                />
              </div>

              {/* Shares / Quantity */}
              <div>
                <label htmlFor="shares" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Number of Shares / Units *
                </label>
                <input
                  id="shares"
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="e.g. 100"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition font-mono"
                />
              </div>

              {/* Average Purchase Price */}
              <div>
                <label htmlFor="avgPrice" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Average Purchase Price (NPR / Rs.) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 font-semibold text-sm">
                    Rs.
                  </div>
                  <input
                    id="avgPrice"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 500"
                    value={averagePurchasePrice}
                    onChange={(e) => setAveragePurchasePrice(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition font-mono"
                  />
                </div>
              </div>

              {/* Current Price */}
              <div>
                <label htmlFor="currPrice" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Current Price (NPR / Rs.) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 font-semibold text-sm">
                    Rs.
                  </div>
                  <input
                    id="currPrice"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 600"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 transition shadow-sm active:scale-98 cursor-pointer"
              >
                {submitting ? 'Saving...' : '+ Add Stock Holding'}
              </button>
            </form>
          </div>

          {/* Holdings Analytics Table */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden space-y-0">
            {/* Table Header & Search */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Stock Holdings &amp; Analytics
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Showing {filteredHoldings.length} of {activeHoldings.length} holdings
                  </p>
                </div>

                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search symbol or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-base sm:text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {filteredHoldings.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-3">
                <div className="text-3xl">📊</div>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  No stock holdings found
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {activeHoldings.length === 0
                    ? 'Use the form on the left to start tracking your NEPSE portfolio.'
                    : 'No holdings match your search query.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 text-xs font-medium border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th scope="col" className="py-3.5 px-3 sm:px-4">Symbol / Company</th>
                      <th scope="col" className="py-3.5 px-3 sm:px-4 text-right">Shares</th>
                      <th scope="col" className="py-3.5 px-3 sm:px-4 text-right">Avg. Price</th>
                      <th scope="col" className="py-3.5 px-3 sm:px-4 text-right">Current Price</th>
                      <th scope="col" className="py-3.5 px-3 sm:px-4 text-right">Invested</th>
                      <th scope="col" className="py-3.5 px-3 sm:px-4 text-right">Current Value</th>
                      <th scope="col" className="py-3.5 px-3 sm:px-4 text-right">Profit / Loss</th>
                      <th scope="col" className="py-3.5 px-3 sm:px-4 text-right">Return %</th>
                      <th scope="col" className="py-3.5 px-3 sm:px-4 text-right">% Weight</th>
                      <th scope="col" className="py-3.5 px-3 sm:px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                    {filteredHoldings.map((item) => {
                      const isProfit = item.profitLoss > 0;
                      const isLoss = item.profitLoss < 0;
                      const isEditingThis = editingPriceId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group"
                        >
                          {/* Symbol & Company */}
                          <td className="py-3.5 px-3 sm:px-4">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                                {item.symbol}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[130px] mt-0.5">
                              {item.companyName}
                            </div>
                          </td>

                          {/* Shares */}
                          <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                            {new Intl.NumberFormat('en-NP').format(item.shares)}
                          </td>

                          {/* Average Purchase Price */}
                          <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                            {formatNepaliCurrency(item.averagePurchasePrice)}
                          </td>

                          {/* Current Price (with inline edit) */}
                          <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                            {isEditingThis ? (
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={tempPriceInput}
                                  onChange={(e) => setTempPriceInput(e.target.value)}
                                  className="w-20 px-2 py-1 bg-white dark:bg-zinc-800 border border-emerald-500 rounded text-xs font-mono text-right text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePriceEdit(item.id);
                                    if (e.key === 'Escape') handleCancelPriceEdit();
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePriceEdit(item.id)}
                                  title="Save price"
                                  className="px-1.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelPriceEdit}
                                  title="Cancel"
                                  className="px-1.5 py-1 rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-700 dark:text-zinc-300 text-xs cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleStartPriceEdit(item.id, item.currentPrice)}
                                className="cursor-pointer group/price inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 font-mono text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                                title="Click to update Current Price"
                              >
                                <span>{formatNepaliCurrency(item.currentPrice)}</span>
                                <span className="opacity-0 group-hover/price:opacity-100 text-[10px] text-zinc-400">
                                  ✏️
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Invested Amount */}
                          <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                            {formatNepaliCurrency(item.investedAmount)}
                          </td>

                          {/* Current Value */}
                          <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {formatNepaliCurrency(item.currentValue)}
                          </td>

                          {/* Profit / Loss */}
                          <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-xs sm:text-sm font-bold whitespace-nowrap">
                            <span
                              className={
                                isProfit
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isLoss
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-zinc-600 dark:text-zinc-400'
                              }
                            >
                              {isProfit ? '+' : ''}{formatNepaliCurrency(item.profitLoss)}
                            </span>
                          </td>

                          {/* Profit / Loss % */}
                          <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-xs sm:text-sm font-bold whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isProfit
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : isLoss
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              {item.profitLossPercentage > 0 ? '+' : ''}
                              {item.profitLossPercentage.toFixed(2)}%
                            </span>
                          </td>

                          {/* Percentage of Portfolio Value */}
                          <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-xs whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-10 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, item.portfolioWeightPercentage))}%` }}
                                />
                              </div>
                              <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                                {item.portfolioWeightPercentage.toFixed(2)}%
                              </span>
                            </div>
                          </td>

                          {/* Action (Delete) */}
                          <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteHolding(item.id)}
                              title="Delete Holding"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors inline-flex items-center justify-center cursor-pointer"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer Summary Bar */}
            {filteredHoldings.length > 0 && (
              <div className="p-3.5 sm:p-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <span>
                    Holdings:{' '}
                    <strong className="text-zinc-900 dark:text-zinc-100">
                      {activeHoldings.length}
                    </strong>
                  </span>
                  <span>
                    Cost:{' '}
                    <strong className="text-zinc-900 dark:text-zinc-100">
                      {formatNepaliCurrency(totalInvested)}
                    </strong>
                  </span>
                  <span>
                    Value:{' '}
                    <strong className="text-zinc-900 dark:text-zinc-100">
                      {formatNepaliCurrency(totalCurrentValue)}
                    </strong>
                  </span>
                  <span>
                    Gain/Loss:{' '}
                    <strong
                      className={
                        isOverallProfit
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : isOverallLoss
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }
                    >
                      {isOverallProfit ? '+' : ''}{formatNepaliCurrency(totalProfitLoss)} ({totalProfitLossPercentage >= 0 ? '+' : ''}{totalProfitLossPercentage.toFixed(2)}%)
                    </strong>
                  </span>
                </div>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-zinc-500 hover:text-rose-600 transition underline cursor-pointer"
                >
                  Clear all holdings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calculation Logic Info */}
        <section className="p-4 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Portfolio Calculation Formula Reference
            </h3>
            <span className="text-xs font-mono text-zinc-500">
              Pure math engine in lib/calculations/finance.ts
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="font-semibold text-zinc-900 dark:text-zinc-200 block mb-0.5">Invested Amount</span>
              <code>Shares × Avg Purchase Price</code>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="font-semibold text-zinc-900 dark:text-zinc-200 block mb-0.5">Current Value</span>
              <code>Shares × Current Price</code>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="font-semibold text-zinc-900 dark:text-zinc-200 block mb-0.5">Profit / Loss</span>
              <code>Current Value − Invested Amount</code>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="font-semibold text-zinc-900 dark:text-zinc-200 block mb-0.5">Profit / Loss %</span>
              <code>(Profit/Loss ÷ Invested) × 100</code>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
