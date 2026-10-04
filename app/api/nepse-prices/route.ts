import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CompanyMeta {
  companyName: string;
  sector: string;
}

interface PriceCache {
  timestamp: number;
  updatedAt: string;
  prices: Record<string, number>;
  meta: Record<string, CompanyMeta>;
  count: number;
}

let globalCache: PriceCache | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * ShareHubNepal's public home-page feed. Confirmed working, unauthenticated,
 * and returns every scrip traded in the current session (LTP, company name,
 * and sector) in one payload — this is NEPSE's real official site's data
 * (nepalstock.com.np) re-served without the obfuscated session token the
 * official site requires, which is why it's used ahead of trying that token
 * scheme directly. The `nepseapi.surajrimal.dev` mirror is kept as a second
 * attempt in case this one is ever unreachable.
 */
const NEPSE_LIVE_ENDPOINTS = [
  'https://sharehubnepal.com/live/api/v2/nepselive/home-page-data',
  'https://nepseapi.surajrimal.dev/LiveMarket',
  'https://nepseapi.surajrimal.dev/PriceVolume',
];

interface ParsedNepseData {
  prices: Record<string, number>;
  meta: Record<string, CompanyMeta>;
}

/**
 * Extracts normalized { prices, meta } maps from raw API responses. Handles
 * multiple possible JSON response shapes defensively, including
 * ShareHubNepal's `liveCompanyData` array (symbol, lastTradedPrice,
 * securityName, sector) and the older unofficial-mirror shapes.
 */
function parseNepsePrices(data: unknown): ParsedNepseData {
  const prices: Record<string, number> = {};
  const meta: Record<string, CompanyMeta> = {};
  if (!data) return { prices, meta };

  let items: unknown[] = [];

  if (Array.isArray(data)) {
    items = data;
  } else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, any>;
    if (Array.isArray(obj.liveCompanyData)) {
      items = obj.liveCompanyData;
    } else if (Array.isArray(obj.data)) {
      items = obj.data;
    } else if (Array.isArray(obj.result)) {
      items = obj.result;
    } else if (Array.isArray(obj.liveMarket)) {
      items = obj.liveMarket;
    } else if (Array.isArray(obj.priceVolume)) {
      items = obj.priceVolume;
    } else {
      // Key-value map of symbols to objects or numbers
      for (const [key, value] of Object.entries(obj)) {
        const symbol = key.trim().toUpperCase();
        if (typeof value === 'number' && !isNaN(value) && value > 0) {
          prices[symbol] = value;
        } else if (typeof value === 'object' && value !== null) {
          const rawPrice =
            value.lastTradedPrice ??
            value.ltp ??
            value.closePrice ??
            value.lastPrice ??
            value.price ??
            value.currentPrice;
          const numPrice =
            typeof rawPrice === 'number'
              ? rawPrice
              : parseFloat(String(rawPrice ?? '').replace(/,/g, ''));
          if (!isNaN(numPrice) && numPrice > 0) {
            prices[symbol] = numPrice;
          }
        }
      }
      return { prices, meta };
    }
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, any>;

    const rawSymbol =
      rec.symbol ??
      rec.securitySymbol ??
      rec.stockSymbol ??
      rec.symbolName ??
      rec.scrip ??
      rec.ticker ??
      rec.companySymbol;

    if (!rawSymbol || typeof rawSymbol !== 'string') continue;
    const cleanSymbol = rawSymbol.trim().toUpperCase();

    const rawPrice =
      rec.lastTradedPrice ??
      rec.ltp ??
      rec.closePrice ??
      rec.lastPrice ??
      rec.price ??
      rec.currentPrice ??
      rec.closingPrice ??
      rec.previousClose;

    const numPrice =
      typeof rawPrice === 'number'
        ? rawPrice
        : parseFloat(String(rawPrice ?? '').replace(/,/g, ''));

    if (!isNaN(numPrice) && numPrice > 0) {
      prices[cleanSymbol] = numPrice;
    }

    const rawName = rec.securityName ?? rec.companyName ?? rec.securityDescription;
    const rawSector = rec.sector ?? rec.sectorName;
    if (typeof rawName === 'string' && rawName.trim()) {
      meta[cleanSymbol] = {
        companyName: rawName.trim(),
        sector: typeof rawSector === 'string' ? rawSector.trim() : '',
      };
    }
  }

  return { prices, meta };
}

async function fetchFromEndpoint(url: string): Promise<ParsedNepseData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FinanceDealer/1.0',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    const parsed = parseNepsePrices(json);
    if (Object.keys(parsed.prices).length > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const now = Date.now();

  // Return fresh in-memory cache if valid
  if (globalCache && now - globalCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(
      {
        success: true,
        updatedAt: globalCache.updatedAt,
        prices: globalCache.prices,
        meta: globalCache.meta,
        count: globalCache.count,
        cached: true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  }

  // Attempt endpoints sequentially
  let fetched: ParsedNepseData | null = null;
  for (const endpoint of NEPSE_LIVE_ENDPOINTS) {
    fetched = await fetchFromEndpoint(endpoint);
    if (fetched && Object.keys(fetched.prices).length > 0) {
      break;
    }
  }

  if (fetched && Object.keys(fetched.prices).length > 0) {
    globalCache = {
      timestamp: now,
      updatedAt: new Date().toISOString(),
      prices: fetched.prices,
      meta: fetched.meta,
      count: Object.keys(fetched.prices).length,
    };

    return NextResponse.json(
      {
        success: true,
        updatedAt: globalCache.updatedAt,
        prices: globalCache.prices,
        meta: globalCache.meta,
        count: globalCache.count,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  }

  // If live fetch failed but we have stale cache, serve stale cache with note
  if (globalCache && Object.keys(globalCache.prices).length > 0) {
    return NextResponse.json(
      {
        success: true,
        updatedAt: globalCache.updatedAt,
        prices: globalCache.prices,
        meta: globalCache.meta,
        count: globalCache.count,
        stale: true,
        error: 'Live NEPSE price service unreachable, serving cached data.',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }

  // Graceful fallback response when completely unavailable
  return NextResponse.json(
    {
      success: false,
      updatedAt: null,
      prices: {},
      meta: {},
      count: 0,
      error: 'Live NEPSE price service is currently unavailable.',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
