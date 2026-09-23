'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LedgerRow } from '@/components/LedgerRow';
import { StockHolding } from '@/types';
import {
  calculatePortfolioAnalytics,
  formatNepaliCurrency,
  formatNepaliNumber,
} from '@/lib/calculations/finance';
import { supabase } from '@/lib/supabase';
import { useGuestMode } from '@/context/GuestModeContext';
import { NepseCompanyMeta, NepsePricesApiResponse } from '@/lib/market-data';

/**
 * NEPSE stock portfolio page. Authenticated users' holdings are read from and
 * written to the Supabase `holdings` table (RLS-scoped to their own user_id);
 * logged-out visitors use the in-memory guest context instead (see
 * GuestModeContext), same pattern as the expenses page.
 *
 * Live NEPSE market prices are periodically fetched server-side via /api/nepse-prices
 * and overlaid on client views for calculations without mutating the user's database.
 */

// Converts a raw Supabase `holdings` row (snake_case columns, possibly using
// legacy units/buy_price naming) into the app's StockHolding shape.
// See app/page.tsx's rowToHolding for the same mapping used on the dashboard.
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
    buyGuestHolding,
    sellGuestHolding,
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

  // Live price tracking state
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [liveMeta, setLiveMeta] = useState<Record<string, NepseCompanyMeta>>({});
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<Date | null>(null);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'loading' | 'live' | 'fallback'>('idle');
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [timeAgoText, setTimeAgoText] = useState<string>('');

  // Buy / Sell mode
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Buy form state
  const [symbol, setSymbol] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [companyNameTouched, setCompanyNameTouched] = useState(false);
  const [shares, setShares] = useState<string>('');
  const [pricePerShare, setPricePerShare] = useState<string>('');
  const [totalPurchasePrice, setTotalPurchasePrice] = useState<string>('');

  // Sell form state
  const [sellHoldingId, setSellHoldingId] = useState<string>('');
  const [sellShares, setSellShares] = useState<string>('');
  const [sellPricePerShare, setSellPricePerShare] = useState<string>('');
  const [sellProceeds, setSellProceeds] = useState<string>('');
  const [sellConfirmation, setSellConfirmation] = useState<{
    symbol: string;
    sharesSold: number;
    realizedGain: number;
  } | null>(null);

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

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return '';
    const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSeconds < 60) return 'just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  // Internal live price polling helper
  const fetchLivePrices = async (isManual = false) => {
    if (isManual) setIsRefreshingPrices(true);
    try {
      const res = await fetch('/api/nepse-prices');
      if (!res.ok) {
        setLiveStatus((prev) => (prev === 'live' ? 'live' : 'fallback'));
        return;
      }
      const data: NepsePricesApiResponse = await res.json();
      if (data && data.prices && Object.keys(data.prices).length > 0) {
        setLivePrices(data.prices);
        if (data.meta) setLiveMeta(data.meta);
        const updateDate = data.updatedAt ? new Date(data.updatedAt) : new Date();
        setLiveUpdatedAt(updateDate);
        setTimeAgoText(formatTimeAgo(updateDate));
        setLiveStatus('live');
      } else {
        setLiveStatus((prev) => (prev === 'live' ? 'live' : 'fallback'));
      }
    } catch {
      setLiveStatus((prev) => (prev === 'live' ? 'live' : 'fallback'));
    } finally {
      if (isManual) setIsRefreshingPrices(false);
    }
  };

  // Poll internal live price API every 3 minutes, update time ago label every 30s
  useEffect(() => {
    fetchLivePrices();

    const pollInterval = setInterval(() => {
      fetchLivePrices();
    }, 3 * 60 * 1000); // 3 minutes

    const timeAgoInterval = setInterval(() => {
      setLiveUpdatedAt((curr) => {
        if (curr) {
          setTimeAgoText(formatTimeAgo(curr));
        }
        return curr;
      });
    }, 30 * 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timeAgoInterval);
    };
  }, []);

  // Active holdings set (Supabase if authenticated, in-memory if guest)
  const activeHoldings = userId ? dbHoldings : guestHoldings;

  // Overlay live prices on top of stored holdings for calculation and display
  const effectiveHoldings = useMemo(() => {
    return activeHoldings.map((holding) => {
      const sym = (holding.symbol || '').toUpperCase().trim();
      const livePrice = livePrices[sym];
      const hasLivePrice = typeof livePrice === 'number' && livePrice > 0;

      return {
        ...holding,
        currentPrice: hasLivePrice ? livePrice : holding.currentPrice,
        isLivePrice: hasLivePrice,
        savedPrice: holding.currentPrice,
      };
    });
  }, [activeHoldings, livePrices]);

  // Run pure calculations with effective holdings
  const portfolioSummary = calculatePortfolioAnalytics(effectiveHoldings);
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
  /**
   * Records a buy. Tops up an existing same-symbol position with a correctly
   * blended weighted-average cost rather than creating a duplicate row.
   */
  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSellConfirmation(null);

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

    const parsedPricePerShare = parseFloat(pricePerShare);
    if (!parsedPricePerShare || isNaN(parsedPricePerShare) || parsedPricePerShare <= 0) {
      setFormError('Please enter the price per share you actually traded at.');
      return;
    }

    const parsedTotalPrice = parseFloat(totalPurchasePrice);
    if (isNaN(parsedTotalPrice) || parsedTotalPrice < 0) {
      setFormError('Please enter what you paid in total, including all charges (Rs. >= 0).');
      return;
    }

    const meta = liveMeta[cleanSymbol];
    const finalCompanyName = companyName.trim() || meta?.companyName || `${cleanSymbol} Security`;
    const finalSector = meta?.sector || undefined;
    const seedCurrentPrice = livePrices[cleanSymbol] ?? parsedTotalPrice / parsedShares;
    const existing = activeHoldings.find((h) => h.symbol === cleanSymbol);

    if (userId) {
      setSubmitting(true);

      if (existing) {
        const combinedShares = existing.shares + parsedShares;
        const combinedAvgPrice =
          (existing.shares * existing.averagePurchasePrice + parsedTotalPrice) / combinedShares;

        const { error } = await supabase
          .from('holdings')
          .update({
            shares: combinedShares,
            average_purchase_price: combinedAvgPrice,
            current_price: seedCurrentPrice,
            sector: existing.sector ?? finalSector,
          })
          .eq('id', existing.id);

        setSubmitting(false);
        if (error) {
          setFormError('Could not update that position. Please try again.');
          return;
        }

        setDbHoldings((prev) =>
          prev.map((h) =>
            h.id === existing.id
              ? {
                  ...h,
                  shares: combinedShares,
                  averagePurchasePrice: combinedAvgPrice,
                  currentPrice: seedCurrentPrice,
                  sector: h.sector ?? finalSector,
                }
              : h
          )
        );
      } else {
        const { data, error } = await supabase
          .from('holdings')
          .insert({
            user_id: userId,
            symbol: cleanSymbol,
            company_name: finalCompanyName,
            shares: parsedShares,
            average_purchase_price: parsedTotalPrice / parsedShares,
            current_price: seedCurrentPrice,
            sector: finalSector,
          })
          .select()
          .single();

        setSubmitting(false);
        if (error || !data) {
          setFormError('Could not save the holding. Please try again.');
          return;
        }

        setDbHoldings((prev) => [rowToHolding(data), ...prev]);
      }
    } else {
      buyGuestHolding({
        symbol: cleanSymbol,
        companyName: finalCompanyName,
        shares: parsedShares,
        totalPurchasePrice: parsedTotalPrice,
        currentPrice: seedCurrentPrice,
        sector: finalSector,
      });
    }

    // Reset form
    setSymbol('');
    setCompanyName('');
    setCompanyNameTouched(false);
    setShares('');
    setPricePerShare('');
    setTotalPurchasePrice('');
    setFormError(null);
  };

  /**
   * Records a sell against an existing holding. The weighted-average cost per
   * share of the remaining position is unchanged by a partial sell — only the
   * quantity shrinks — so this only reduces shares, or removes the row
   * entirely on a full exit, and reports the realized gain/loss inline.
   */
  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSellConfirmation(null);

    const holding = activeHoldings.find((h) => h.id === sellHoldingId);
    if (!holding) {
      setFormError('Please choose which holding you are selling.');
      return;
    }

    const parsedShares = parseFloat(sellShares);
    if (!parsedShares || isNaN(parsedShares) || parsedShares <= 0) {
      setFormError('Please enter a valid number of shares greater than 0.');
      return;
    }
    if (parsedShares > holding.shares) {
      setFormError(
        `You only hold ${formatNepaliNumber(holding.shares, 0)} shares of ${holding.symbol}.`
      );
      return;
    }

    const parsedSellPricePerShare = parseFloat(sellPricePerShare);
    if (!parsedSellPricePerShare || isNaN(parsedSellPricePerShare) || parsedSellPricePerShare <= 0) {
      setFormError('Please enter the price per share you actually sold at.');
      return;
    }

    const parsedProceeds = parseFloat(sellProceeds);
    if (isNaN(parsedProceeds) || parsedProceeds < 0) {
      setFormError('Please enter what you received in total, after all charges (Rs. >= 0).');
      return;
    }

    const realizedGain = parsedProceeds - parsedShares * holding.averagePurchasePrice;
    const remainingShares = holding.shares - parsedShares;

    if (userId) {
      setSubmitting(true);

      if (remainingShares <= 0) {
        const { error } = await supabase.from('holdings').delete().eq('id', holding.id);
        setSubmitting(false);
        if (error) {
          setFormError('Could not record that sale. Please try again.');
          return;
        }
        setDbHoldings((prev) => prev.filter((h) => h.id !== holding.id));
      } else {
        const { error } = await supabase
          .from('holdings')
          .update({ shares: remainingShares })
          .eq('id', holding.id);
        setSubmitting(false);
        if (error) {
          setFormError('Could not record that sale. Please try again.');
          return;
        }
        setDbHoldings((prev) =>
          prev.map((h) => (h.id === holding.id ? { ...h, shares: remainingShares } : h))
        );
      }
    } else {
      sellGuestHolding(sellHoldingId, parsedShares, parsedProceeds);
    }

    setSellConfirmation({ symbol: holding.symbol, sharesSold: parsedShares, realizedGain });
    setSellHoldingId('');
    setSellShares('');
    setSellPricePerShare('');
    setSellProceeds('');
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

  // Start inline price edit (editing the stored fallback price)
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

  // Charges implied by price-per-share vs. the total actually debited/received —
  // shown so a typo or an unexpected brokerage fee is visible before submitting,
  // not silently blended into the average price.
  const buyCharges = (() => {
    const s = parseFloat(shares);
    const p = parseFloat(pricePerShare);
    const t = parseFloat(totalPurchasePrice);
    if (isNaN(s) || isNaN(p) || isNaN(t) || s <= 0) return null;
    return t - s * p;
  })();

  const sellCharges = (() => {
    const s = parseFloat(sellShares);
    const p = parseFloat(sellPricePerShare);
    const t = parseFloat(sellProceeds);
    if (isNaN(s) || isNaN(p) || isNaN(t) || s <= 0) return null;
    return s * p - t;
  })();

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
    <main className="page bound">
      <span className="binding-label">NEPSE</span>
      <div className="space-y-5">
        {/* Masthead */}
        <header className="masthead">
          <div>
            <h1>Floor sheet</h1>
            <p className="masthead-note">
              Every scrip you hold, what it cost, what it is worth now, and how much of the
              portfolio it accounts for.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {liveStatus === 'live' ? (
              <span className="tag tag-gain">
                <span
                  className="pulse-live inline-block h-1.5 w-1.5 shrink-0 bg-[currentColor]"
                  aria-hidden="true"
                />
                Live, {timeAgoText || 'just now'}
              </span>
            ) : (
              <span className="tag">Saved prices</span>
            )}
            <button
              type="button"
              onClick={() => fetchLivePrices(true)}
              disabled={isRefreshingPrices}
              className="btn btn-sm"
            >
              {isRefreshingPrices ? 'Refreshing…' : 'Refresh prices'}
            </button>
          </div>
        </header>

        {loadError && <div className="note note-loss">{loadError}</div>}
        {loadingHoldings && <p className="fig fig-sm fig-mute">Reading the book&hellip;</p>}

        {!userId && authChecked && (
          <div className="note note-warn">
            <span>
              This is a <strong>scratch page</strong>. Holdings stay in memory and are gone when
              you reload.
            </span>
            <Link href="/login" className="btn btn-warn btn-sm">
              Sign in to keep them
            </Link>
          </div>
        )}

        {/* Position totals */}
        <section className="sheet">
          <div className="sheet-hd">
            <h2 className="sheet-title">
              Position
            </h2>
            <span className="sheet-sub">
              {activeHoldings.length} {activeHoldings.length === 1 ? 'scrip' : 'scrips'} held,
              valued in NPR
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="sheet-bd border-b border-rule lg:border-b-0 lg:border-r">
              <div className="ledger">
                <LedgerRow label="Cost basis" amount={totalInvested} unit="Rs" tone="mute" />
                <LedgerRow label="Market value" amount={totalCurrentValue} unit="Rs" large />
              </div>
            </div>
            <div className="sheet-bd">
              <div className="ledger">
                <LedgerRow
                  label={isOverallLoss ? 'Unrealised loss' : 'Unrealised gain'}
                  amount={totalProfitLoss}
                  unit="Rs"
                  signed
                  tone={isOverallLoss ? 'loss' : isOverallProfit ? 'gain' : 'mute'}
                  large
                />
                <LedgerRow
                  label="Return on cost"
                  value={
                    totalInvested > 0
                      ? `${totalProfitLossPercentage >= 0 ? '+' : '−'}${Math.abs(
                          totalProfitLossPercentage
                        ).toFixed(2)}%`
                      : '0.00%'
                  }
                  tone={isOverallLoss ? 'loss' : isOverallProfit ? 'gain' : 'mute'}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          {/* Buy / Sell */}
          <div className="sheet lg:col-span-4">
            <div className="sheet-hd">
              <h2 className="sheet-title">{mode === 'buy' ? 'Buy' : 'Sell'}</h2>
              {!userId && <span className="tag tag-warn">Scratch</span>}
            </div>
            <div className="sheet-bd space-y-3">
              <div className="seg" role="group" aria-label="Buy or sell">
                <button
                  type="button"
                  aria-pressed={mode === 'buy'}
                  onClick={() => {
                    setMode('buy');
                    setFormError(null);
                  }}
                  className="flex-1"
                >
                  Buy
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'sell'}
                  onClick={() => {
                    setMode('sell');
                    setFormError(null);
                  }}
                  className="flex-1"
                  disabled={activeHoldings.length === 0}
                >
                  Sell
                </button>
              </div>

              {formError && <div className="note note-loss">{formError}</div>}
              {sellConfirmation && (
                <div className={`note ${sellConfirmation.realizedGain >= 0 ? 'note-gain' : 'note-loss'}`}>
                  Sold {formatNepaliNumber(sellConfirmation.sharesSold, 0)} {sellConfirmation.symbol} —
                  realized {sellConfirmation.realizedGain >= 0 ? 'gain' : 'loss'} of{' '}
                  {formatNepaliCurrency(Math.abs(sellConfirmation.realizedGain))}.
                </div>
              )}

              {mode === 'buy' ? (
                <form onSubmit={handleBuy} className="space-y-3">
                  <div>
                    <label htmlFor="symbol" className="field-lbl">
                      Scrip
                    </label>
                    <input
                      id="symbol"
                      type="text"
                      placeholder="NABIL"
                      list="live-symbols"
                      value={symbol}
                      onChange={(e) => {
                        const next = e.target.value.toUpperCase();
                        setSymbol(next);
                        const meta = liveMeta[next];
                        if (meta && !companyNameTouched) setCompanyName(meta.companyName);
                        const livePrice = livePrices[next];
                        if (livePrice && !pricePerShare) setPricePerShare(String(livePrice));
                      }}
                      required
                      className="field font-mono uppercase tracking-[0.08em]"
                    />
                    <datalist id="live-symbols">
                      {Object.keys(liveMeta).map((sym) => (
                        <option key={sym} value={sym} />
                      ))}
                    </datalist>
                    <p className="field-hint">
                      {activeHoldings.some((h) => h.symbol === symbol.trim().toUpperCase())
                        ? `You already hold this — buying will add to that position at a blended average cost.`
                        : 'The NEPSE ticker, e.g. NABIL, GBIME, HDL.'}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="companyName" className="field-lbl">
                      Company name
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      placeholder="Nabil Bank Limited"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setCompanyNameTouched(true);
                      }}
                      className="field"
                    />
                    <p className="field-hint">Filled in automatically for scrips traded today.</p>
                  </div>

                  <div>
                    <label htmlFor="shares" className="field-lbl">
                      Shares
                    </label>
                    <input
                      id="shares"
                      type="number"
                      step="any"
                      min="0.001"
                      placeholder="100"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      required
                      className="field field-num"
                    />
                  </div>

                  <div>
                    <label htmlFor="pricePerShare" className="field-lbl">
                      Price per share
                    </label>
                    <div className="field-wrap">
                      <span className="prefix">Rs</span>
                      <input
                        id="pricePerShare"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="565"
                        value={pricePerShare}
                        onChange={(e) => setPricePerShare(e.target.value)}
                        required
                        className="field field-num"
                      />
                    </div>
                    <p className="field-hint">The traded price per share, before any charges.</p>
                  </div>

                  <div>
                    <label htmlFor="totalPrice" className="field-lbl">
                      Total purchase price
                    </label>
                    <div className="field-wrap">
                      <span className="prefix">Rs</span>
                      <input
                        id="totalPrice"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="50350"
                        value={totalPurchasePrice}
                        onChange={(e) => setTotalPurchasePrice(e.target.value)}
                        required
                        className="field field-num"
                      />
                    </div>
                    <p className="field-hint">
                      Everything actually debited — shares &times; price per share, plus broker
                      commission, DP and SEBON fees. The average cost per share is worked out from
                      this.
                    </p>
                  </div>

                  {buyCharges !== null && (
                    <div className={`note ${buyCharges < 0 ? 'note-warn' : ''}`}>
                      {buyCharges < 0
                        ? `Total is Rs ${formatNepaliNumber(
                            Math.abs(buyCharges)
                          )} less than shares × price per share — double-check the figures.`
                        : `Implied charges: Rs ${formatNepaliNumber(buyCharges)}.`}
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="btn btn-ink btn-block">
                    {submitting ? 'Saving…' : 'Buy shares'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSell} className="space-y-3">
                  <div>
                    <label htmlFor="sellSymbol" className="field-lbl">
                      Holding
                    </label>
                    <select
                      id="sellSymbol"
                      value={sellHoldingId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSellHoldingId(id);
                        setSellShares('');
                        const holding = activeHoldings.find((h) => h.id === id);
                        const livePrice = holding ? livePrices[holding.symbol] : undefined;
                        if (livePrice) setSellPricePerShare(String(livePrice));
                      }}
                      required
                      className="field"
                    >
                      <option value="">Choose a holding</option>
                      {activeHoldings.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.symbol} — {formatNepaliNumber(h.shares, 0)} shares
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="sellShares" className="field-lbl">
                        Shares to sell
                      </label>
                      {sellHoldingId && (
                        <button
                          type="button"
                          className="link-ink text-[11px]"
                          onClick={() =>
                            setSellShares(
                              String(activeHoldings.find((h) => h.id === sellHoldingId)?.shares ?? '')
                            )
                          }
                        >
                          Sell all
                        </button>
                      )}
                    </div>
                    <input
                      id="sellShares"
                      type="number"
                      step="any"
                      min="0.001"
                      placeholder="50"
                      value={sellShares}
                      onChange={(e) => setSellShares(e.target.value)}
                      required
                      className="field field-num"
                    />
                  </div>

                  <div>
                    <label htmlFor="sellPricePerShare" className="field-lbl">
                      Price per share
                    </label>
                    <div className="field-wrap">
                      <span className="prefix">Rs</span>
                      <input
                        id="sellPricePerShare"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="565"
                        value={sellPricePerShare}
                        onChange={(e) => setSellPricePerShare(e.target.value)}
                        required
                        className="field field-num"
                      />
                    </div>
                    <p className="field-hint">The traded price per share, before any charges.</p>
                  </div>

                  <div>
                    <label htmlFor="sellProceeds" className="field-lbl">
                      Total sale proceeds
                    </label>
                    <div className="field-wrap">
                      <span className="prefix">Rs</span>
                      <input
                        id="sellProceeds"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="32500"
                        value={sellProceeds}
                        onChange={(e) => setSellProceeds(e.target.value)}
                        required
                        className="field field-num"
                      />
                    </div>
                    <p className="field-hint">
                      What actually landed in your account — shares &times; price per share, minus
                      broker commission, DP and capital gains tax.
                    </p>
                  </div>

                  {sellCharges !== null && (
                    <div className={`note ${sellCharges < 0 ? 'note-warn' : ''}`}>
                      {sellCharges < 0
                        ? `Proceeds are Rs ${formatNepaliNumber(
                            Math.abs(sellCharges)
                          )} more than shares × price per share — double-check the figures.`
                        : `Implied charges: Rs ${formatNepaliNumber(sellCharges)}.`}
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="btn btn-ink btn-block">
                    {submitting ? 'Saving…' : 'Sell shares'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Floor sheet */}
          <div className="sheet lg:col-span-8">
            <div className="sheet-hd">
              <div>
                <h2 className="sheet-title">Holdings</h2>
                <p className="sheet-sub">
                  Showing {filteredHoldings.length} of {activeHoldings.length}
                </p>
              </div>
              <input
                type="text"
                placeholder="Filter by scrip or company"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field w-full sm:w-56"
                aria-label="Filter holdings"
              />
            </div>

            {filteredHoldings.length === 0 ? (
              <div className="sheet-bd">
                <div className="empty">
                  <p className="empty-mark">[ NO ENTRIES ]</p>
                  <p className="empty-title">Nothing on the sheet</p>
                  <p className="empty-body">
                    {activeHoldings.length === 0
                      ? 'Add a scrip on the left to start tracking your NEPSE portfolio.'
                      : 'No holding matches that filter.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="scroll-x">
                <table className="floor min-w-[46rem]">
                  <thead>
                    <tr>
                      <th scope="col">Scrip</th>
                      <th scope="col" className="text-right">
                        Qty
                      </th>
                      <th scope="col" className="text-right">
                        Buy
                      </th>
                      <th scope="col" className="text-right">
                        LTP
                      </th>
                      <th scope="col" className="text-right">
                        Cost
                      </th>
                      <th scope="col" className="text-right">
                        Value
                      </th>
                      <th scope="col" className="text-right">
                        P/L
                      </th>
                      <th scope="col" className="text-right">
                        Weight
                      </th>
                      <th scope="col" className="text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHoldings.map((item) => {
                      const isProfit = item.profitLoss > 0;
                      const isLoss = item.profitLoss < 0;
                      const isEditingThis = editingPriceId === item.id;
                      const plClass = isProfit ? 'fig-gain' : isLoss ? 'fig-loss' : 'fig-mute';

                      return (
                        <tr key={item.id}>
                          <td>
                            <span className="ticker">{item.symbol}</span>
                            <span className="mt-1 block max-w-[10rem] truncate text-[11px] text-ink-faint">
                              {item.companyName}
                            </span>
                          </td>

                          <td className="num">{formatNepaliNumber(item.shares, 0)}</td>

                          <td className="num fig-mute">
                            {formatNepaliNumber(item.averagePurchasePrice)}
                          </td>

                          <td className="num">
                            {isEditingThis ? (
                              <span className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={tempPriceInput}
                                  onChange={(e) => setTempPriceInput(e.target.value)}
                                  className="field field-num w-24 !py-0.5"
                                  autoFocus
                                  aria-label={`Saved price for ${item.symbol}`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePriceEdit(item.id);
                                    if (e.key === 'Escape') handleCancelPriceEdit();
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePriceEdit(item.id)}
                                  className="btn btn-ink btn-sm"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelPriceEdit}
                                  className="btn btn-sm"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartPriceEdit(item.id, item.savedPrice ?? item.currentPrice)
                                }
                                className="inline-flex items-center gap-1.5 font-mono tabular-nums hover:text-khata"
                                title={
                                  item.isLivePrice
                                    ? `Live ${item.currentPrice}. Saved fallback ${
                                        item.savedPrice ?? item.currentPrice
                                      }. Click to edit the fallback.`
                                    : 'Click to edit the saved price'
                                }
                              >
                                {formatNepaliNumber(item.currentPrice)}
                                {item.isLivePrice && (
                                  <span
                                    className="pulse-live inline-block h-1.5 w-1.5 shrink-0 bg-gain"
                                    aria-label="live price"
                                  />
                                )}
                              </button>
                            )}
                          </td>

                          <td className="num fig-mute">
                            {formatNepaliNumber(item.investedAmount)}
                          </td>

                          <td className="num font-medium">
                            {formatNepaliNumber(item.currentValue)}
                          </td>

                          <td className={`num ${plClass}`}>
                            {isProfit ? '+' : isLoss ? '−' : ''}
                            {formatNepaliNumber(Math.abs(item.profitLoss))}
                            <span className="mt-0.5 block text-[11px]">
                              {item.profitLossPercentage > 0 ? '+' : ''}
                              {item.profitLossPercentage.toFixed(2)}%
                            </span>
                          </td>

                          <td className="num">
                            {item.portfolioWeightPercentage.toFixed(1)}%
                            <span className="weightbar" aria-hidden="true">
                              <span
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, item.portfolioWeightPercentage)
                                  )}%`,
                                }}
                              />
                            </span>
                          </td>

                          <td className="num whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setMode('sell');
                                  setSellHoldingId(item.id);
                                  setSellPricePerShare(item.currentPrice ? String(item.currentPrice) : '');
                                  setFormError(null);
                                  setSellConfirmation(null);
                                }}
                                className="link-ink text-[11px]"
                              >
                                Sell
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHolding(item.id)}
                                className="text-[11px] text-ink-faint hover:text-loss hover:underline"
                              >
                                Remove
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

            {filteredHoldings.length > 0 && (
              <div className="sheet-ft flex flex-wrap items-center justify-between gap-3">
                <span>
                  Cost <span className="fig fig-sm">{formatNepaliCurrency(totalInvested)}</span>
                  <span className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-rule-strong" />
                  Value{' '}
                  <span className="fig fig-sm">{formatNepaliCurrency(totalCurrentValue)}</span>
                  <span className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-rule-strong" />
                  <span
                    className={`fig fig-sm ${
                      isOverallProfit ? 'fig-gain' : isOverallLoss ? 'fig-loss' : ''
                    }`}
                  >
                    {isOverallProfit ? '+' : ''}
                    {formatNepaliCurrency(totalProfitLoss)} (
                    {totalProfitLossPercentage >= 0 ? '+' : ''}
                    {totalProfitLossPercentage.toFixed(2)}%)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-ink-faint hover:text-loss hover:underline"
                >
                  Clear all holdings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* How each column is worked out */}
        <section className="sheet">
          <div className="sheet-hd">
            <h2 className="sheet-title">How these are worked out</h2>
            <span className="sheet-sub">lib/calculations/finance.ts</span>
          </div>
          <div className="sheet-bd">
            <dl className="ledger">
              <div className="ledger-row">
                <dt className="lbl">Average buy price</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">total purchase price &divide; shares</dd>
              </div>
              <div className="ledger-row">
                <dt className="lbl">Cost</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">shares &times; average buy price</dd>
              </div>
              <div className="ledger-row">
                <dt className="lbl">Value</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">shares &times; latest price</dd>
              </div>
              <div className="ledger-row">
                <dt className="lbl">Unrealised P/L</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">value &minus; cost</dd>
              </div>
              <div className="ledger-row">
                <dt className="lbl">Return</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">P/L &divide; cost &times; 100</dd>
              </div>
              <div className="ledger-row">
                <dt className="lbl">Realised P/L on a sale</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="fig fig-sm">sale proceeds &minus; (shares sold &times; average buy price)</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  );
}
