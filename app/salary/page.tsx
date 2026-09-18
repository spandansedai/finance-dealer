'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { NEPAL_INDIVIDUAL_TAX_BRACKETS, NEPAL_TAX_FISCAL_YEAR } from '@/lib/config/nepalTax';
import { supabase } from '@/lib/supabase';
import { SavingsGoalDraft, SalaryProfileDraft, useGuestMode } from '@/context/GuestModeContext';

interface ProfileRow { monthly_salary: number | string; monthly_allowances: number | string; monthly_deductions: number | string; expected_monthly_expense: number | string; savings_target_amount: number | string | null; savings_target_percentage: number | string | null; }
interface GoalRow { id: string; name: string; target_amount: number | string; }
interface TaxLine { label: string; taxableAmount: number; rate: number; tax: number; }

const EMPTY_PROFILE: SalaryProfileDraft = { monthlySalary: 0, monthlyAllowances: 0, monthlyDeductions: 0, expectedMonthlyExpense: 0, savingsTargetAmount: null, savingsTargetPercentage: null };
const numberOrZero = (value: string) => Math.max(0, Number(value) || 0);
const optionalNumber = (value: string) => value.trim() === '' ? null : numberOrZero(value);
const formatNpr = (amount: number) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(amount);
const rowToProfile = (row: ProfileRow): SalaryProfileDraft => ({ monthlySalary: Number(row.monthly_salary), monthlyAllowances: Number(row.monthly_allowances), monthlyDeductions: Number(row.monthly_deductions), expectedMonthlyExpense: Number(row.expected_monthly_expense), savingsTargetAmount: row.savings_target_amount === null ? null : Number(row.savings_target_amount), savingsTargetPercentage: row.savings_target_percentage === null ? null : Number(row.savings_target_percentage) });

function calculateTax(taxableIncome: number): TaxLine[] {
  let remaining = Math.max(0, taxableIncome);
  return NEPAL_INDIVIDUAL_TAX_BRACKETS.map((bracket) => {
    const taxableAmount = bracket.amount === null ? remaining : Math.min(remaining, bracket.amount);
    remaining -= taxableAmount;
    return { label: bracket.label, taxableAmount, rate: bracket.rate, tax: taxableAmount * bracket.rate };
  }).filter((line) => line.taxableAmount > 0);
}

export default function SalaryPage() {
  const { addGuestTransaction, guestSalaryProfile, guestSavingsGoals, saveGuestSalaryPlan } = useGuestMode();
  const [profile, setProfile] = useState<SalaryProfileDraft>(EMPTY_PROFILE);
  const [goals, setGoals] = useState<SavingsGoalDraft[]>([]);
  const [removedGoalIds, setRemovedGoalIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingSalary, setLoggingSalary] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = async () => {
    const [profileResult, goalsResult] = await Promise.all([
      supabase.from('salary_profiles').select('*').maybeSingle(),
      supabase.from('savings_goals').select('id, name, target_amount').order('created_at'),
    ]);
    if (profileResult.error || goalsResult.error) { setError('Could not load your salary plan. Please try refreshing.'); return; }
    setProfile(profileResult.data ? rowToProfile(profileResult.data) : EMPTY_PROFILE);
    setGoals((goalsResult.data ?? []).map((goal: GoalRow) => ({ id: goal.id, name: goal.name, targetAmount: Number(goal.target_amount) })));
    setRemovedGoalIds([]);
  };

  useEffect(() => {
    let mounted = true;
    const initialise = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) await loadPlan(); else { setProfile(guestSalaryProfile ?? EMPTY_PROFILE); setGoals(guestSavingsGoals); setRemovedGoalIds([]); }
      if (mounted) setLoading(false);
    };
    initialise();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user?.id ?? null;
      setUserId(id); setLoading(true);
      if (id) await loadPlan(); else { setProfile(guestSalaryProfile ?? EMPTY_PROFILE); setGoals(guestSavingsGoals); setRemovedGoalIds([]); }
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const grossMonthlyIncome = profile.monthlySalary + profile.monthlyAllowances;
  const plannedMonthlySavings = grossMonthlyIncome - profile.monthlyDeductions - profile.expectedMonthlyExpense;
  const targetSavings = profile.savingsTargetAmount ?? (profile.savingsTargetPercentage === null ? null : grossMonthlyIncome * profile.savingsTargetPercentage / 100);
  const targetDifference = targetSavings === null ? null : plannedMonthlySavings - targetSavings;
  const annualGrossIncome = grossMonthlyIncome * 12;
  const annualDeductions = profile.monthlyDeductions * 12;
  const taxableIncome = Math.max(0, annualGrossIncome - annualDeductions);
  const taxLines = useMemo(() => calculateTax(taxableIncome), [taxableIncome]);
  const annualTax = taxLines.reduce((sum, line) => sum + line.tax, 0);
  const monthlyTax = annualTax / 12;
  const monthlyTakeHome = grossMonthlyIncome - profile.monthlyDeductions - monthlyTax;

  const updateProfile = <K extends keyof SalaryProfileDraft>(key: K, value: SalaryProfileDraft[K]) => { setProfile((current) => ({ ...current, [key]: value })); setMessage(null); };
  const addGoal = () => setGoals((current) => [...current, { id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', targetAmount: 0 }]);
  const updateGoal = (id: string, updates: Partial<SavingsGoalDraft>) => { setGoals((current) => current.map((goal) => goal.id === id ? { ...goal, ...updates } : goal)); setMessage(null); };
  const removeGoal = (id: string) => { if (!id.startsWith('new-')) setRemovedGoalIds((current) => [...current, id]); setGoals((current) => current.filter((goal) => goal.id !== id)); setMessage(null); };

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setMessage(null);
    const validGoals = goals.filter((goal) => goal.name.trim() && goal.targetAmount > 0);
    if (validGoals.length !== goals.length) { setError('Give every savings goal a name and a target amount greater than zero, or remove it.'); return; }
    if (!userId) { saveGuestSalaryPlan(profile, validGoals); setGoals(validGoals); setMessage('Saved in guest memory. It will reset when you refresh.'); return; }
    setSaving(true);
    const { error: profileError } = await supabase.from('salary_profiles').upsert({ user_id: userId, monthly_salary: profile.monthlySalary, monthly_allowances: profile.monthlyAllowances, monthly_deductions: profile.monthlyDeductions, expected_monthly_expense: profile.expectedMonthlyExpense, savings_target_amount: profile.savingsTargetAmount, savings_target_percentage: profile.savingsTargetPercentage }, { onConflict: 'user_id' });
    if (profileError) { setSaving(false); setError('Could not save your salary plan. Please try again.'); return; }
    const existingGoals = validGoals.filter((goal) => !goal.id.startsWith('new-'));
    const newGoals = validGoals.filter((goal) => goal.id.startsWith('new-'));
    const results = await Promise.all([
      removedGoalIds.length ? supabase.from('savings_goals').delete().in('id', removedGoalIds) : Promise.resolve({ error: null }),
      existingGoals.length ? supabase.from('savings_goals').upsert(existingGoals.map((goal) => ({ id: goal.id, user_id: userId, name: goal.name.trim(), target_amount: goal.targetAmount }))) : Promise.resolve({ error: null }),
      newGoals.length ? supabase.from('savings_goals').insert(newGoals.map((goal) => ({ user_id: userId, name: goal.name.trim(), target_amount: goal.targetAmount }))) : Promise.resolve({ error: null }),
    ]);
    setSaving(false);
    if (results.some((result) => result.error)) { setError('Your profile was saved, but one or more goals could not be saved. Please try again.'); return; }
    await loadPlan(); setMessage('Salary plan saved.');
  };

  const logSalary = async () => {
    const amount = grossMonthlyIncome - profile.monthlyDeductions;
    if (amount <= 0) { setError('Enter a salary greater than your deductions before logging it.'); return; }
    setError(null);
    const transaction = { type: 'income' as const, amount, category: 'Salary', description: 'Monthly salary from Salary & Tax Management', date: new Date().toISOString().slice(0, 10) };
    if (!userId) { addGuestTransaction(transaction); setMessage('Salary logged as a guest transaction.'); return; }
    setLoggingSalary(true);
    const { error: transactionError } = await supabase.from('transactions').insert({ ...transaction, user_id: userId });
    setLoggingSalary(false);
    if (transactionError) { setError('Could not log this month’s salary. Please try again.'); return; }
    setMessage('This month’s salary was logged as an income transaction.');
  };

  if (loading) return <main className="min-h-screen p-6 text-zinc-500">Loading salary plan…</main>;
  const inputClass = 'mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700';
  const moneyFields: Array<[string, keyof Pick<SalaryProfileDraft, 'monthlySalary' | 'monthlyAllowances' | 'monthlyDeductions' | 'expectedMonthlyExpense'>]> = [['Monthly salary', 'monthlySalary'], ['Monthly allowances', 'monthlyAllowances'], ['Monthly deductions', 'monthlyDeductions'], ['Expected monthly expense', 'expectedMonthlyExpense']];

  return <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 md:p-10"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-3 border-b border-zinc-200 pb-5 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-emerald-600">Personal planning</p><h1 className="text-3xl font-bold tracking-tight">Salary & Tax Management</h1><p className="mt-1 text-sm text-zinc-500">Plan recurring pay, spending, savings, and an estimated Nepal tax position.</p></div><Link href="/" className="text-sm font-medium text-emerald-600 hover:underline">← Back to Dashboard</Link></header>
    {!userId && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Guest mode: salary plans and goals stay only in memory and reset on refresh.</div>}{error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}{message && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</div>}
    <div className="grid gap-6 lg:grid-cols-5"><form onSubmit={savePlan} className="space-y-6 lg:col-span-3">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><h2 className="text-lg font-semibold">Salary & planning inputs</h2><p className="mt-1 text-sm text-zinc-500">Expected expense is your budget, separate from logged transactions.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{moneyFields.map(([label, key]) => <label key={key} className="text-sm font-medium">{label} (NPR)<input type="number" min="0" step="1" value={profile[key]} onChange={(e) => updateProfile(key, numberOrZero(e.target.value))} className={inputClass} /></label>)}<label className="text-sm font-medium">Desired monthly savings amount (NPR)<input type="number" min="0" step="1" placeholder="Optional" value={profile.savingsTargetAmount ?? ''} onChange={(e) => updateProfile('savingsTargetAmount', optionalNumber(e.target.value))} className={inputClass} /></label><label className="text-sm font-medium">Or desired savings rate (%)<input type="number" min="0" max="100" step="0.1" placeholder="Optional" value={profile.savingsTargetPercentage ?? ''} onChange={(e) => updateProfile('savingsTargetPercentage', optionalNumber(e.target.value))} className={inputClass} /></label></div></section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Savings goals</h2><p className="text-sm text-zinc-500">Keep it simple: a name and target amount.</p></div><button type="button" onClick={addGoal} className="rounded-lg border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400">+ Add goal</button></div><div className="mt-4 space-y-3">{goals.map((goal) => <div key={goal.id} className="grid gap-2 sm:grid-cols-[1fr_170px_auto]"><input aria-label="Goal name" value={goal.name} onChange={(e) => updateGoal(goal.id, { name: e.target.value })} placeholder="e.g. Emergency fund" className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" /><input aria-label="Goal target amount" type="number" min="1" value={goal.targetAmount || ''} onChange={(e) => updateGoal(goal.id, { targetAmount: numberOrZero(e.target.value) })} placeholder="Target NPR" className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" /><button type="button" onClick={() => removeGoal(goal.id)} className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">Remove</button></div>)}{goals.length === 0 && <p className="text-sm text-zinc-500">No goals yet. Add one to see an estimated timeline.</p>}</div></section><button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save salary plan'}</button>
    </form><aside className="space-y-6 lg:col-span-2"><section className="rounded-2xl bg-emerald-700 p-5 text-white shadow-sm"><p className="text-sm text-emerald-100">Planned monthly savings</p><p className="mt-1 text-3xl font-bold">{formatNpr(plannedMonthlySavings)}</p><p className="mt-2 text-sm text-emerald-100">{formatNpr(grossMonthlyIncome - profile.monthlyDeductions)} planned income − {formatNpr(profile.expectedMonthlyExpense)} expected expense</p>{targetSavings !== null && <p className="mt-4 rounded-lg bg-white/15 p-3 text-sm">{targetDifference !== null && targetDifference >= 0 ? `On track: ${formatNpr(targetDifference)} ${targetDifference === 0 ? 'at' : 'over'} your target.` : `Under target by ${formatNpr(Math.abs(targetDifference ?? 0))}.`}</p>}</section><section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><h2 className="text-lg font-semibold">Goal estimates</h2><div className="mt-3 space-y-3">{goals.map((goal) => <div key={goal.id} className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800"><p className="font-medium">{goal.name || 'Untitled goal'} · {formatNpr(goal.targetAmount)}</p><p className="mt-1 text-zinc-600 dark:text-zinc-300">{plannedMonthlySavings > 0 && goal.targetAmount > 0 ? `At this rate, you could reach this goal in approximately ${Math.ceil(goal.targetAmount / plannedMonthlySavings)} months.` : 'Set a positive planned monthly savings amount to estimate a timeline.'}</p></div>)}</div></section><button type="button" onClick={logSalary} disabled={loggingSalary} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800">{loggingSalary ? 'Logging…' : "Log this month’s salary as a transaction"}</button></aside></div>
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-col justify-between gap-2 sm:flex-row"><div><h2 className="text-lg font-semibold">Nepal income tax estimate</h2><p className="text-sm text-zinc-500">{NEPAL_TAX_FISCAL_YEAR} resident natural-person marginal schedule.</p></div><p className="text-sm font-medium">Estimated monthly tax: {formatNpr(monthlyTax)}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><div><p className="text-xs text-zinc-500">Annual gross income</p><p className="font-semibold">{formatNpr(annualGrossIncome)}</p></div><div><p className="text-xs text-zinc-500">Annual deductions</p><p className="font-semibold">{formatNpr(annualDeductions)}</p></div><div><p className="text-xs text-zinc-500">Taxable income</p><p className="font-semibold">{formatNpr(taxableIncome)}</p></div><div><p className="text-xs text-zinc-500">Est. monthly take-home</p><p className="font-semibold">{formatNpr(monthlyTakeHome)}</p></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800"><tr><th className="py-2 font-medium">Tax bracket</th><th className="py-2 font-medium">Income in bracket</th><th className="py-2 font-medium">Rate</th><th className="py-2 text-right font-medium">Estimated tax</th></tr></thead><tbody>{taxLines.length ? taxLines.map((line) => <tr key={line.label} className="border-b border-zinc-100 dark:border-zinc-800"><td className="py-2">{line.label}</td><td className="py-2">{formatNpr(line.taxableAmount)}</td><td className="py-2">{(line.rate * 100).toFixed(0)}%</td><td className="py-2 text-right">{formatNpr(line.tax)}</td></tr>) : <tr><td className="py-3 text-zinc-500" colSpan={4}>Enter income to see the bracket breakdown.</td></tr>}</tbody><tfoot><tr><td className="pt-3 font-semibold" colSpan={3}>Estimated annual income tax</td><td className="pt-3 text-right font-semibold">{formatNpr(annualTax)}</td></tr></tfoot></table></div><p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">This is an estimate for personal planning purposes only, not official tax advice. Consult a tax professional or the Inland Revenue Department for official figures.</p></section>
  </div></main>;
}
