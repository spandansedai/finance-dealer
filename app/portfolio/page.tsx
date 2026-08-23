'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PortfolioHolding, HoldingValidationErrors } from '@/types/portfolio';
import {
  calculateHoldingInvestedAmount,
  calculatePortfolioSummary,
  validateHoldingInput,
} from '@/lib/calculations/portfolio';
import { formatNepaliCurrency } from '@/lib/calculations/finance';
import { MetricCard } from '@/components/MetricCard';

const INITIAL_HOLDINGS: PortfolioHolding[] = [
  {
    id: 'h-1',
    symbol: 'NABIL',
    companyName: 'Nabil Bank Limited',
    shares: 100,
    averagePurchasePrice: 500,
    purchaseDate: '2026-06-15',
  },
  {
    id: 'h-2',
    symbol: 'GBIME',
    companyName: 'Global IME Bank Limited',
    shares: 150,
    averagePurchasePrice: 240,
    purchaseDate: '2026-07-02',
  },
  {
    id: 'h-3',
    symbol: 'HDL',
    companyName: 'Himalayan Distillery Limited',
    shares: 50,
    averagePurchasePrice: 1600,
    purchaseDate: '2026-07-20',
  },
];

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(INITIAL_HOLDINGS);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [averagePurchasePrice, setAveragePurchasePrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formErrors, setFormErrors] = useState<HoldingValidationErrors>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Summary calculations
  const summary = calculatePortfolioSummary(holdings);

  // Clear / Reset Form
  const resetForm = () => {
    setEditingId(null);
    setSymbol('');
    setCompanyName('');
    setShares('');
    setAveragePurchasePrice('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormErrors({});
  };

  // Start editing an existing holding
  const handleStartEdit = (holding: PortfolioHolding) => {
    setEditingId(holding.id);
    setSymbol(holding.symbol);
    setCompanyName(holding.companyName);
    setShares(holding.shares.toString());
    setAveragePurchasePrice(holding.averagePurchasePrice.toString());
    setPurchaseDate(holding.purchaseDate);
    setFormErrors({});
    setFeedbackMessage(null);
    // Scroll smoothly to form on smaller screens
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    resetForm();
    setFeedbackMessage(null);
  };

  // Handle submit (Add or Edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    const validation = validateHoldingInput({
      symbol,
      companyName,
      shares,
      averagePurchasePrice,
      purchaseDate,
    });

    if (!validation.isValid || !validation.parsed) {
      setFormErrors(validation.errors);
      return;
    }

    const { symbol: cleanSymbol, companyName: cleanCompany, shares: numShares, averagePurchasePrice: numPrice, purchaseDate: cleanDate } =
      validation.parsed;

    if (editingId) {
      // Update existing holding
      setHoldings((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                symbol: cleanSymbol,
                companyName: cleanCompany,
                shares: numShares,
                averagePurchasePrice: numPrice,
                purchaseDate: cleanDate,
              }
            : item
        )
      );
      setFeedbackMessage(`Holding for ${cleanSymbol} updated successfully.`);
    } else {
      // Add new holding
      const newHolding: PortfolioHolding = {
        id: `h-${Date.now()}`,
        symbol: cleanSymbol,
        companyName: cleanCompany,
        shares: numShares,
        averagePurchasePrice: numPrice,
        purchaseDate: cleanDate,
      };
      setHoldings((prev) => [newHolding, ...prev]);
      setFeedbackMessage(`Holding for ${cleanSymbol} added successfully.`);
    }

    resetForm();
  };

  // Delete holding
  const handleDeleteHolding = (id: string, holdingSymbol: string) => {
    if (editingId === id) {
      resetForm();
    }
    setHoldings((prev) => prev.filter((item) => item.id !== id));
    setFeedbackMessage(`Holding ${holdingSymbol} deleted.`);
  };

  // Filtered holdings list
  const filteredHoldings = holdings.filter(
    (h) =>
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      h.companyName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Live estimated cost for form preview
  const liveShares = parseFloat(shares) || 0;
  const livePrice = parseFloat(averagePurchasePrice) || 0;
  const liveInvested = liveShares > 0 && livePrice > 0 ? liveShares * livePrice : 0;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">NEPSE Stock Portfolio</h1>
              <span className="text-xs px-2.5 py-0.5 font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full border border-purple-500/20">
                v0.4 Active
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Manual stock portfolio and cost-basis tracker for Nepalese equity holdings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Prominent Portfolio Metrics Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              Portfolio Cost Basis Summary
            </h2>
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
              Currency: NPR (Rs.)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* 1. Total Portfolio Cost (Prominently displayed) */}
            <div className="p-6 rounded-2xl border border-purple-500/25 bg-purple-950/10 dark:bg-purple-950/25 text-purple-600 dark:text-purple-400 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Total Portfolio Cost
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                  Cost Basis
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">Rs.</span>
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {new Intl.NumberFormat('en-NP', {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 0,
                  }).format(summary.totalPortfolioCost)}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Sum of invested amount across all {summary.totalHoldings} stock holding{summary.totalHoldings === 1 ? '' : 's'}
              </p>
            </div>

            {/* 2. Total Shares */}
            <MetricCard
              label="Total Shares Held"
              formattedValue={new Intl.NumberFormat('en-NP').format(summary.totalShares)}
              currency=""
              type="neutral"
              badgeText="Units"
              subtitle="Cumulative quantity of equity units"
            />

            {/* 3. Total Holdings */}
            <MetricCard
              label="Distinct Scrips"
              formattedValue={summary.totalHoldings.toString()}
              currency=""
              type="neutral"
              badgeText="Companies"
              subtitle="Active Nepalese stocks logged"
            />
          </div>

          {/* Cost Basis Information Disclaimer Banner */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
            <span className="text-base shrink-0 mt-0.5">ℹ️</span>
            <div>
              <strong>Manual Cost Basis Mode:</strong> Live NEPSE market prices and P&amp;L calculations are intentionally disabled in v0.4. All metrics represent your manually entered purchase prices and total invested cost basis.
            </div>
          </div>
        </section>

        {/* Feedback / Toast Message */}
        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <span>{feedbackMessage}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-100 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content: Add/Edit Holding Form + Holdings Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Stock Holding Form */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {editingId ? 'Edit Stock Holding' : 'Add Stock Holding'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {editingId
                    ? 'Update shares or average purchase price for this holding.'
                    : 'Record a new Nepalese stock holding in your portfolio.'}
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Stock Symbol Field */}
              <div>
                <label
                  htmlFor="stock-symbol"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Stock Symbol (Ticker) *
                </label>
                <input
                  id="stock-symbol"
                  type="text"
                  placeholder="e.g. NABIL, GBIME, HDL"
                  value={symbol}
                  onChange={(e) => {
                    setSymbol(e.target.value.toUpperCase());
                    if (formErrors.symbol) setFormErrors((prev) => ({ ...prev, symbol: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 uppercase font-mono font-bold bg-zinc-50 dark:bg-zinc-800/50 border ${
                    formErrors.symbol
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-zinc-300 dark:border-zinc-700 focus:ring-purple-500'
                  } rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 transition`}
                />
                {formErrors.symbol && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formErrors.symbol}</p>
                )}
              </div>

              {/* Company Name Field */}
              <div>
                <label
                  htmlFor="company-name"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Company Name *
                </label>
                <input
                  id="company-name"
                  type="text"
                  placeholder="e.g. Nabil Bank Limited"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (formErrors.companyName)
                      setFormErrors((prev) => ({ ...prev, companyName: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border ${
                    formErrors.companyName
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-zinc-300 dark:border-zinc-700 focus:ring-purple-500'
                  } rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 transition`}
                />
                {formErrors.companyName && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formErrors.companyName}</p>
                )}
              </div>

              {/* Shares and Average Price (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Number of Shares */}
                <div>
                  <label
                    htmlFor="shares-count"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    Number of Shares *
                  </label>
                  <input
                    id="shares-count"
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 100"
                    value={shares}
                    onChange={(e) => {
                      setShares(e.target.value);
                      if (formErrors.shares) setFormErrors((prev) => ({ ...prev, shares: undefined }));
                    }}
                    className={`w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border ${
                      formErrors.shares
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-zinc-300 dark:border-zinc-700 focus:ring-purple-500'
                    } rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 transition`}
                  />
                  {formErrors.shares && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formErrors.shares}</p>
                  )}
                </div>

                {/* Average Purchase Price */}
                <div>
                  <label
                    htmlFor="avg-price"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    Avg. Purchase Price (Rs.) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 text-xs font-semibold">
                      Rs.
                    </div>
                    <input
                      id="avg-price"
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="e.g. 500"
                      value={averagePurchasePrice}
                      onChange={(e) => {
                        setAveragePurchasePrice(e.target.value);
                        if (formErrors.averagePurchasePrice)
                          setFormErrors((prev) => ({ ...prev, averagePurchasePrice: undefined }));
                      }}
                      className={`w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border ${
                        formErrors.averagePurchasePrice
                          ? 'border-rose-500 focus:ring-rose-500'
                          : 'border-zinc-300 dark:border-zinc-700 focus:ring-purple-500'
                      } rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 transition`}
                    />
                  </div>
                  {formErrors.averagePurchasePrice && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {formErrors.averagePurchasePrice}
                    </p>
                  )}
                </div>
              </div>

              {/* Purchase Date */}
              <div>
                <label
                  htmlFor="purchase-date"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Purchase Date *
                </label>
                <input
                  id="purchase-date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => {
                    setPurchaseDate(e.target.value);
                    if (formErrors.purchaseDate)
                      setFormErrors((prev) => ({ ...prev, purchaseDate: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border ${
                    formErrors.purchaseDate
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-zinc-300 dark:border-zinc-700 focus:ring-purple-500'
                  } rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 transition`}
                />
                {formErrors.purchaseDate && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    {formErrors.purchaseDate}
                  </p>
                )}
              </div>

              {/* Live Cost Calculation Preview */}
              {liveInvested > 0 && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-xs flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Calculated Invested Amount:
                  </span>
                  <span className="font-bold text-purple-700 dark:text-purple-300 font-mono">
                    {formatNepaliCurrency(liveInvested)}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 focus:ring-2 focus:ring-purple-400 shadow-sm transition-all transform active:scale-98"
                >
                  {editingId ? '✓ Update Holding' : '+ Add Stock Holding'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="py-3 px-4 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Holdings Table Section */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
            {/* Table Header Controls */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Current Holdings
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Showing {filteredHoldings.length} of {holdings.length} stock scrips
                  </p>
                </div>

                {/* Quick Add Preset Helper */}
                <div className="text-xs text-zinc-400">
                  Total Cost: <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{formatNepaliCurrency(summary.totalPortfolioCost)}</strong>
                </div>
              </div>

              {/* Search Bar */}
              <div>
                <input
                  type="text"
                  placeholder="Search holdings by ticker symbol or company name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Holdings Table */}
            {filteredHoldings.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-3xl">📈</div>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  No stock holdings found
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {holdings.length === 0
                    ? 'Use the form on the left to manually record your first Nepalese stock holding.'
                    : 'No holdings match your search query.'}
                </p>
                {holdings.length === 0 && (
                  <button
                    onClick={() => setHoldings(INITIAL_HOLDINGS)}
                    className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    Load Sample Holdings (NABIL, GBIME, HDL)
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 text-xs font-medium border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th scope="col" className="py-3 px-4">Symbol</th>
                      <th scope="col" className="py-3 px-4">Company</th>
                      <th scope="col" className="py-3 px-4 text-right">Shares</th>
                      <th scope="col" className="py-3 px-4 text-right">Avg. Price</th>
                      <th scope="col" className="py-3 px-4 text-right">Total Invested</th>
                      <th scope="col" className="py-3 px-4 text-center">Purchase Date</th>
                      <th scope="col" className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                    {filteredHoldings.map((holding) => {
                      const totalInvested = calculateHoldingInvestedAmount(
                        holding.shares,
                        holding.averagePurchasePrice
                      );
                      const isCurrentlyEditing = editingId === holding.id;

                      return (
                        <tr
                          key={holding.id}
                          className={`transition-colors group ${
                            isCurrentlyEditing
                              ? 'bg-purple-500/10 dark:bg-purple-950/30'
                              : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30'
                          }`}
                        >
                          {/* Symbol */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {holding.symbol}
                            </span>
                          </td>

                          {/* Company */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
                              {holding.companyName}
                            </div>
                          </td>

                          {/* Shares */}
                          <td className="py-3.5 px-4 text-right font-mono text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                            {new Intl.NumberFormat('en-NP').format(holding.shares)}
                          </td>

                          {/* Average Purchase Price */}
                          <td className="py-3.5 px-4 text-right font-mono text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                            {formatNepaliCurrency(holding.averagePurchasePrice)}
                          </td>

                          {/* Total Invested */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                            {formatNepaliCurrency(totalInvested)}
                          </td>

                          {/* Purchase Date */}
                          <td className="py-3.5 px-4 text-center text-xs font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {holding.purchaseDate}
                          </td>

                          {/* Actions (Edit & Delete) */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleStartEdit(holding)}
                                title="Edit Holding"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteHolding(holding.id, holding.symbol)}
                                title="Delete Holding"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
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
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer */}
            {filteredHoldings.length > 0 && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  Showing {filteredHoldings.length} of {holdings.length} scrips • Filtered Total Cost:{' '}
                  <strong className="text-purple-700 dark:text-purple-300 font-mono">
                    {formatNepaliCurrency(
                      calculatePortfolioSummary(filteredHoldings).totalPortfolioCost
                    )}
                  </strong>
                </span>
                <button
                  onClick={() => {
                    setHoldings([]);
                    resetForm();
                  }}
                  className="text-xs text-zinc-500 hover:text-rose-600 transition underline"
                >
                  Clear all holdings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
