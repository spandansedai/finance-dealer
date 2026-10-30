/**
 * @file supabase/functions/monthly-summary/index.ts
 * @description Edge Function that emails a financial summary of the previous English (Gregorian)
 * month (income, expenses, savings rate, top spending categories) plus a snapshot of NEPSE holdings,
 * to every user who turned on summary emails with the "Monthly" schedule in Settings.
 * Triggered at 03:00 UTC (08:45 Nepal time) on the 1st of each month by pg_cron
 * (see supabase/migrations/*_schedule_monthly_summary.sql). Old ledger data is pruned an hour
 * later (see *_prune_old_ledger_data.sql), after this has read the month it reports on.
 *
 * Required secrets (`supabase secrets set ...`):
 *   RESEND_API_KEY  - Resend API key (re_...)
 *   RESEND_FROM     - Sender, e.g. "Finance Dealer <reports@yourdomain.com>" (domain must be verified in Resend)
 *   CRON_SECRET     - Shared secret; callers must send it in the `x-cron-secret` header
 *   APP_URL         - Optional. Public site URL, e.g. https://example.vercel.app, used for the
 *                     "manage email settings" link. Without it the email names the Settings page.
 *
 * Request body (optional JSON):
 *   { "dryRun": true }          - Build summaries but don't send; returns them in the response
 *   { "onlyEmail": "a@b.com" }  - Restrict to a single user (handy for testing)
 *   { "month": "2026-09" }      - Summarize a specific month instead of the previous one
 */

import { createClient } from "npm:@supabase/supabase-js@2";

interface TransactionRow {
  user_id: string;
  type: "income" | "expense";
  amount: number | string;
  category: string | null;
  date: string;
}

interface HoldingRow {
  user_id: string;
  symbol: string | null;
  company_name: string | null;
  shares: number | string | null;
  average_purchase_price: number | string | null;
  total_cost: number | string | null;
  current_price: number | string | null;
}

interface UserSummary {
  email: string;
  month: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  topExpenses: { category: string; amount: number }[];
  transactionCount: number;
  portfolio: { invested: number; currentValue: number; profitLoss: number; profitLossPct: number; holdings: number };
}

// Nepal Standard Time is UTC+05:45; months are bucketed in local time, not UTC.
const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/** Returns the "YYYY-MM" string for the calendar month before the current one in Nepal time. */
function previousMonth(now: Date = new Date()): string {
  const local = new Date(now.getTime() + NPT_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth(); // 0-based current month == 1-based previous month
  return month === 0 ? `${year - 1}-12` : `${year}-${String(month).padStart(2, "0")}`;
}

/** Returns the inclusive start and exclusive end dates (YYYY-MM-DD) of a "YYYY-MM" month. */
function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: `${month}-01`, end: `${next}-01` };
}

function formatNpr(amount: number): string {
  const abs = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : ""}Rs. ${abs}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function buildSummary(email: string, month: string, txs: TransactionRow[], holdings: HoldingRow[]): UserSummary {
  let income = 0;
  let expenses = 0;
  const byCategory = new Map<string, number>();

  for (const tx of txs) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "income") {
      income += amount;
    } else {
      expenses += amount;
      const category = tx.category || "Other Expense";
      byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
    }
  }

  let invested = 0;
  let currentValue = 0;
  for (const h of holdings) {
    const shares = Number(h.shares) || 0;
    // Cost is what was actually paid; older rows without it fall back to shares × buy price.
    invested += h.total_cost != null ? Number(h.total_cost) || 0 : shares * (Number(h.average_purchase_price) || 0);
    currentValue += shares * (Number(h.current_price) || 0);
  }

  const savings = income - expenses;
  return {
    email,
    month,
    income,
    expenses,
    savings,
    savingsRate: income > 0 ? Number(((savings / income) * 100).toFixed(2)) : 0,
    topExpenses: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    transactionCount: txs.length,
    portfolio: {
      invested,
      currentValue,
      profitLoss: currentValue - invested,
      profitLossPct: invested > 0 ? Number((((currentValue - invested) / invested) * 100).toFixed(2)) : 0,
      holdings: holdings.length,
    },
  };
}

function renderEmail(s: UserSummary, appUrl: string | null): string {
  const row = (label: string, value: string, color = "#18181b") =>
    `<tr><td style="padding:6px 0;color:#52525b">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:${color}">${value}</td></tr>`;
  const signed = (n: number) => (n >= 0 ? "#16a34a" : "#dc2626");

  const categories = s.topExpenses.length
    ? s.topExpenses.map((c) => row(escapeHtml(c.category), formatNpr(c.amount))).join("")
    : `<tr><td style="padding:6px 0;color:#71717a">No expenses recorded.</td></tr>`;

  const portfolio = s.portfolio.holdings
    ? row("Invested", formatNpr(s.portfolio.invested)) +
      row("Current value", formatNpr(s.portfolio.currentValue)) +
      row(
        "Profit / loss",
        `${formatNpr(s.portfolio.profitLoss)} (${s.portfolio.profitLossPct}%)`,
        signed(s.portfolio.profitLoss),
      )
    : `<tr><td style="padding:6px 0;color:#71717a">No holdings yet.</td></tr>`;

  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:12px;padding:24px">
    <h1 style="margin:0 0 4px;font-size:20px;color:#18181b">Your ${monthLabel(s.month)} summary</h1>
    <p style="margin:0 0 20px;color:#71717a;font-size:14px">${s.transactionCount} transactions recorded</p>
    <h2 style="font-size:15px;color:#18181b;margin:0 0 4px">Cash flow</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse">
      ${row("Income", formatNpr(s.income), "#16a34a")}
      ${row("Expenses", formatNpr(s.expenses), "#dc2626")}
      ${row("Net savings", formatNpr(s.savings), signed(s.savings))}
      ${row("Savings rate", `${s.savingsRate}%`)}
    </table>
    <h2 style="font-size:15px;color:#18181b;margin:20px 0 4px">Top spending</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse">${categories}</table>
    <h2 style="font-size:15px;color:#18181b;margin:20px 0 4px">Portfolio (as of today)</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse">${portfolio}</table>
  </div>
  <p style="text-align:center;color:#a1a1aa;font-size:12px">Sent monthly by Finance Dealer because you turned on summary emails.<br>${
    appUrl
      ? `<a href="${escapeHtml(appUrl)}/settings" style="color:#71717a">Change or turn off these emails</a>`
      : "To stop them, switch off \"Send recurring reports\" in Settings."
  }</p>
</div></body></html>`;
}

/** Resolves the privileged key, preferring the new secret keys over the legacy service_role key. */
function serviceKey(): string {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      const key = parsed.default ?? Object.values(parsed)[0];
      if (key) return key;
    } catch {
      // fall through to legacy key
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("No Supabase secret key available in the function environment");
  return legacy;
}

/** Fetches every row of a table for the given filter, paging past the 1000-row API limit. */
async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = await req.json().catch(() => ({})) as { dryRun?: boolean; onlyEmail?: string; month?: string };
  const month = body.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) ? body.month : previousMonth();
  const { start, end } = monthRange(month);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") ?? "Finance Dealer <onboarding@resend.dev>";
  if (!body.dryRun && !resendKey) return json({ error: "RESEND_API_KEY is not set" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Collect confirmed users with an email address.
  const users: { id: string; email: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return json({ error: `listUsers failed: ${error.message}` }, 500);
    for (const u of data.users) {
      if (u.email && u.email_confirmed_at && !u.is_anonymous) users.push({ id: u.id, email: u.email });
    }
    if (data.users.length < 1000) break;
  }
  // Only people who switched on summary emails with the monthly schedule in Settings.
  const { data: prefs, error: prefsError } = await supabase
    .from("user_email_preferences")
    .select("user_id")
    .eq("enabled", true)
    .eq("frequency", "monthly");
  if (prefsError) return json({ error: `user_email_preferences failed: ${prefsError.message}` }, 500);
  const optedIn = new Set((prefs ?? []).map((p) => p.user_id as string));

  const targets = users
    .filter((u) => optedIn.has(u.id))
    .filter((u) => !body.onlyEmail || u.email.toLowerCase() === body.onlyEmail.toLowerCase());

  const [transactions, holdings] = await Promise.all([
    fetchAll<TransactionRow>((a, b) =>
      supabase.from("transactions").select("user_id, type, amount, category, date")
        .gte("date", start).lt("date", end).order("id").range(a, b)
    ),
    fetchAll<HoldingRow>((a, b) =>
      supabase.from("holdings")
        .select("user_id, symbol, company_name, shares, average_purchase_price, total_cost, current_price")
        .order("id").range(a, b)
    ),
  ]);

  const summaries: UserSummary[] = [];
  for (const user of targets) {
    const txs = transactions.filter((t) => t.user_id === user.id);
    const userHoldings = holdings.filter((h) => h.user_id === user.id);
    // Skip users with nothing to report rather than sending an empty email.
    if (txs.length === 0 && userHoldings.length === 0) continue;
    summaries.push(buildSummary(user.email, month, txs, userHoldings));
  }

  if (body.dryRun) return json({ month, users: targets.length, summaries });

  const appUrl = Deno.env.get("APP_URL")?.replace(/\/+$/, "") || null;
  const toEmail = (s: UserSummary) => ({
    from,
    to: [s.email],
    subject: `Your ${monthLabel(month)} financial summary`,
    html: renderEmail(s, appUrl),
  });
  const post = (url: string, payload: unknown, idempotencyKey: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

  // Resend's batch endpoint accepts up to 100 emails per request, but rejects the whole
  // batch if any one recipient is refused. On a failed batch, fall back to sending each
  // email on its own so one bad address can't stop everyone else's summary.
  const results: { sent: number; failed: { email?: string; status: number; error: string }[] } = { sent: 0, failed: [] };
  for (let i = 0; i < summaries.length; i += 100) {
    const chunk = summaries.slice(i, i + 100);
    const res = await post("https://api.resend.com/emails/batch", chunk.map(toEmail), `monthly-summary-${month}-${i}`);
    if (res.ok) {
      results.sent += chunk.length;
      continue;
    }
    const batchError = await res.text();
    if (chunk.length === 1) {
      results.failed.push({ email: chunk[0].email, status: res.status, error: batchError });
      continue;
    }
    for (const s of chunk) {
      // Stay under Resend's default rate limit of 2 requests per second.
      await new Promise((r) => setTimeout(r, 600));
      const single = await post("https://api.resend.com/emails", toEmail(s), `monthly-summary-${month}-${s.email}`);
      if (single.ok) results.sent += 1;
      else results.failed.push({ email: s.email, status: single.status, error: await single.text() });
    }
  }

  console.log(`monthly-summary ${month}: sent=${results.sent} failed=${results.failed.length}`);
  return json({ month, ...results }, results.failed.length ? 502 : 200);
});
