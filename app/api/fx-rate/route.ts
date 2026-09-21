import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NRB_RATES_ENDPOINT = 'https://www.nrb.org.np/api/forex/v1/rates';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

interface NrbRate {
  currency?: { unit?: string | number; ISO3?: string; iso3?: string; name?: string };
  buy?: string | number;
  sell?: string | number;
}

interface NrbRateDay {
  date?: string;
  published_on?: string;
  rates?: NrbRate[];
}

interface UsdRate {
  buy: number;
  sell: number;
  asOf: string;
  fetchedAt: string;
}

let lastSuccessfulRate: UsdRate | null = null;

const parseNumber = (value: string | number | undefined) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

function extractUsdRate(payload: unknown): UsdRate | null {
  if (!Array.isArray(payload)) return null;
  const days = (payload as NrbRateDay[])
    .filter((day) => Array.isArray(day.rates) && day.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  for (const day of days) {
    const usd = day.rates?.find((rate) => {
      const code = rate.currency?.iso3 || rate.currency?.ISO3;
      return typeof code === 'string' && code.toUpperCase() === 'USD';
    });
    if (!usd) continue;
    const unit = parseNumber(usd.currency?.unit) ?? 1;
    const buy = parseNumber(usd.buy);
    const sell = parseNumber(usd.sell);
    if (unit <= 0 || buy === null || sell === null || buy <= 0 || sell <= 0) continue;
    return { buy: buy / unit, sell: sell / unit, asOf: day.date!, fetchedAt: new Date().toISOString() };
  }
  return null;
}

async function fetchNrbUsdRate(): Promise<UsdRate | null> {
  const today = new Date();
  const tenDaysAgo = new Date(today);
  tenDaysAgo.setUTCDate(today.getUTCDate() - 10);
  const formatDate = (value: Date) => value.toISOString().slice(0, 10);
  const url = new URL(NRB_RATES_ENDPOINT);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '20');
  url.searchParams.set('from', formatDate(tenDaysAgo));
  url.searchParams.set('to', formatDate(today));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'FinanceDealer/1.0' },
      signal: controller.signal,
      next: { revalidate: 14_400 },
    });
    if (!response.ok) return null;
    const body = await response.json() as { status?: { code?: number }; data?: { payload?: unknown } };
    if (body.status?.code !== 200) return null;
    return extractUsdRate(body.data?.payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const now = Date.now();
  if (lastSuccessfulRate && now - Date.parse(lastSuccessfulRate.fetchedAt) < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, ...lastSuccessfulRate, stale: false, cached: true }, { headers: { 'Cache-Control': 'public, s-maxage=14400, stale-while-revalidate=3600' } });
  }

  const liveRate = await fetchNrbUsdRate();
  if (liveRate) {
    lastSuccessfulRate = liveRate;
    return NextResponse.json({ success: true, ...liveRate, stale: false }, { headers: { 'Cache-Control': 'public, s-maxage=14400, stale-while-revalidate=3600' } });
  }

  if (lastSuccessfulRate) {
    return NextResponse.json({ success: true, ...lastSuccessfulRate, stale: true, error: 'NRB is currently unavailable; the last successfully fetched rate is being used.' }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  }

  return NextResponse.json({ success: false, error: 'NRB is currently unavailable and no cached rate is available. Enter a manual NPR-per-USD rate to continue.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
