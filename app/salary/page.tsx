'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { NEPAL_INDIVIDUAL_TAX_BRACKETS, NEPAL_TAX_FISCAL_YEAR } from '@/lib/config/nepalTax';
import { formatNepaliCurrency, formatNepaliNumber } from '@/lib/calculations/finance';
import { supabase } from '@/lib/supabase';
import { LedgerRow } from '@/components/LedgerRow';
import { SavingsGoalDraft, SalaryProfileDraft, useGuestMode } from '@/context/GuestModeContext';

interface ProfileRow { monthly_salary: number | string; monthly_allowances: number | string; monthly_deductions: number | string; expected_monthly_expense: number | string; savings_target_amount: number | string | null; savings_target_percentage: number | string | null; }
interface GoalRow { id: string; name: string; target_amount: number | string; }
interface TaxLine { label: string; taxableAmount: number; rate: number; tax: number; }

const EMPTY_PROFILE: SalaryProfileDraft = { monthlySalary: 0, monthlyAllowances: 0, monthlyDeductions: 0, expectedMonthlyExpense: 0, savingsTargetAmount: null, savingsTargetPercentage: null };
const numberOrZero = (value: string) => Math.max(0, Number(value) || 0);
const optionalNumber = (value: string) => value.trim() === '' ? null : numberOrZero(value);
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
  const incomeAfterDeductions = grossMonthlyIncome - profile.monthlyDeductions;
  const plannedMonthlySavings = incomeAfterDeductions - profile.expectedMonthlyExpense;
  const targetSavings = profile.savingsTargetAmount ?? (profile.savingsTargetPercentage === null ? null : grossMonthlyIncome * profile.savingsTargetPercentage / 100);
  const targetDifference = targetSavings === null ? null : plannedMonthlySavings - targetSavings;
  const annualGrossIncome = grossMonthlyIncome * 12;
  const annualDeductions = profile.monthlyDeductions * 12;
  const taxableIncome = Math.max(0, annualGrossIncome - annualDeductions);
  const taxLines = useMemo(() => calculateTax(taxableIncome), [taxableIncome]);
  const annualTax = taxLines.reduce((sum, line) => sum + line.tax, 0);
  const monthlyTax = annualTax / 12;
  const monthlyTakeHome = grossMonthlyIncome - profile.monthlyDeductions - monthlyTax;
  const isDeficit = plannedMonthlySavings < 0;

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

  if (loading) {
    return (
      <main className="page bound">
        <p className="fig fig-sm fig-mute">Reading the book&hellip;</p>
      </main>
    );
  }

  const moneyFields: Array<[string, keyof Pick<SalaryProfileDraft, 'monthlySalary' | 'monthlyAllowances' | 'monthlyDeductions' | 'expectedMonthlyExpense'>]> = [
    ['Monthly salary', 'monthlySalary'],
    ['Monthly allowances', 'monthlyAllowances'],
    ['Monthly deductions', 'monthlyDeductions'],
    ['Expected monthly expense', 'expectedMonthlyExpense'],
  ];

  return (
    <main className="page bound">
      <span className="binding-label">SALARY</span>
      <div className="space-y-6">
        <header className="masthead">
          <div>
            <h1>Salary &amp; tax</h1>
            <p className="masthead-note">
              Plan recurring pay, budget expected spending, set savings goals, and estimate this
              year&rsquo;s Nepal income tax position.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="stamp">{NEPAL_TAX_FISCAL_YEAR}</span>
            <Link href="/" className="link-ink">
              &larr; Dashboard
            </Link>
          </div>
        </header>

        {!userId && (
          <div className="note note-warn">
            <span>Guest mode: salary plans and goals stay only in memory and reset on refresh.</span>
          </div>
        )}
        {error && <div className="note note-loss">{error}</div>}
        {message && <div className="note note-gain">{message}</div>}

        <div className="grid gap-4 lg:grid-cols-5">
          <form onSubmit={savePlan} className="space-y-4 lg:col-span-3">
            <section className="sheet">
              <div className="sheet-hd">
                <h2 className="sheet-title">Salary &amp; planning inputs</h2>
              </div>
              <div className="sheet-bd">
                <p className="sheet-sub mb-3">
                  Expected expense is your budget, separate from logged transactions.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {moneyFields.map(([label, key]) => (
                    <div key={key}>
                      <label className="field-lbl" htmlFor={key}>
                        {label}
                      </label>
                      <div className="field-wrap">
                        <span className="prefix">Rs</span>
                        <input
                          id={key}
                          type="number"
                          min="0"
                          step="1"
                          value={profile[key]}
                          onChange={(e) => updateProfile(key, numberOrZero(e.target.value))}
                          className="field field-num"
                        />
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="field-lbl" htmlFor="savingsTargetAmount">
                      Desired monthly savings amount
                    </label>
                    <div className="field-wrap">
                      <span className="prefix">Rs</span>
                      <input
                        id="savingsTargetAmount"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Optional"
                        value={profile.savingsTargetAmount ?? ''}
                        onChange={(e) => updateProfile('savingsTargetAmount', optionalNumber(e.target.value))}
                        className="field field-num"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="field-lbl" htmlFor="savingsTargetPercentage">
                      Or desired savings rate (%)
                    </label>
                    <input
                      id="savingsTargetPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="Optional"
                      value={profile.savingsTargetPercentage ?? ''}
                      onChange={(e) => updateProfile('savingsTargetPercentage', optionalNumber(e.target.value))}
                      className="field field-num"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="sheet">
              <div className="sheet-hd">
                <div>
                  <h2 className="sheet-title">Savings goals</h2>
                  <p className="sheet-sub">A name and a target amount.</p>
                </div>
                <button type="button" onClick={addGoal} className="btn btn-ink btn-sm">
                  + Add goal
                </button>
              </div>
              <div className="sheet-bd">
                {goals.length === 0 ? (
                  <div className="empty">
                    <p className="empty-mark">[ NO GOALS ]</p>
                    <p className="empty-title">Nothing set aside for, yet</p>
                    <p className="empty-body">
                      Add a goal to see an estimated timeline against your planned savings.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {goals.map((goal) => (
                      <div
                        key={goal.id}
                        className="grid gap-2 border-b border-rule pb-2.5 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_170px_auto] sm:items-center"
                      >
                        <input
                          aria-label="Goal name"
                          value={goal.name}
                          onChange={(e) => updateGoal(goal.id, { name: e.target.value })}
                          placeholder="e.g. Emergency fund"
                          className="field"
                        />
                        <div className="field-wrap">
                          <span className="prefix">Rs</span>
                          <input
                            aria-label="Goal target amount"
                            type="number"
                            min="1"
                            value={goal.targetAmount || ''}
                            onChange={(e) => updateGoal(goal.id, { targetAmount: numberOrZero(e.target.value) })}
                            placeholder="Target"
                            className="field field-num"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeGoal(goal.id)}
                          className="justify-self-start text-[13px] text-loss hover:underline sm:justify-self-end"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <button type="submit" disabled={saving} className="btn btn-ink btn-block">
              {saving ? 'Saving…' : 'Save salary plan'}
            </button>
          </form>

          <aside className="space-y-4 lg:col-span-2">
            <section className="sheet">
              <div className="sheet-hd">
                <h2 className="sheet-title">
                  Planned position
                </h2>
              </div>
              <div className="sheet-bd">
                <div className="ledger">
                  <LedgerRow label="Income after deductions" amount={incomeAfterDeductions} unit="Rs" tone="mute" />
                  <LedgerRow label="Expected expense" amount={profile.expectedMonthlyExpense} unit="Rs" tone="loss" />
                  <LedgerRow
                    label={isDeficit ? 'Shortfall' : 'Planned savings'}
                    amount={plannedMonthlySavings}
                    unit="Rs"
                    tone={isDeficit ? 'loss' : 'gain'}
                    total
                    large
                  />
                </div>
                {targetSavings !== null && (
                  <div className={`note ${targetDifference !== null && targetDifference >= 0 ? 'note-gain' : 'note-loss'} mt-3`}>
                    {targetDifference !== null && targetDifference >= 0
                      ? `On track: ${formatNepaliCurrency(targetDifference)} ${targetDifference === 0 ? 'at' : 'over'} your target.`
                      : `Under target by ${formatNepaliCurrency(Math.abs(targetDifference ?? 0))}.`}
                  </div>
                )}
              </div>
            </section>

            <section className="sheet">
              <div className="sheet-hd">
                <h2 className="sheet-title">Goal estimates</h2>
              </div>
              <div className="sheet-bd">
                {goals.length === 0 ? (
                  <p className="fig fig-sm fig-mute">Add a goal to see an estimate.</p>
                ) : (
                  <div className="ledger">
                    {goals.map((goal) => (
                      <div key={goal.id} className="ledger-row">
                        <span className="lbl">{goal.name || 'Untitled goal'}</span>
                        <span className="leader" aria-hidden="true" />
                        <span className="fig fig-md">{formatNepaliCurrency(goal.targetAmount)}</span>
                        <p className="ledger-note">
                          {plannedMonthlySavings > 0 && goal.targetAmount > 0
                            ? `At this rate, about ${Math.ceil(goal.targetAmount / plannedMonthlySavings)} months to reach.`
                            : 'Set a positive planned monthly savings amount to estimate a timeline.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <button type="button" onClick={logSalary} disabled={loggingSalary} className="btn btn-block">
              {loggingSalary ? 'Logging…' : 'Log this month’s salary as a transaction'}
            </button>
          </aside>
        </div>

        <section className="sheet">
          <div className="sheet-hd">
            <div>
              <h2 className="sheet-title">Nepal income tax estimate</h2>
              <p className="sheet-sub">{NEPAL_TAX_FISCAL_YEAR} resident natural-person marginal schedule.</p>
            </div>
            <span className="whitespace-nowrap">
              <span className="fig fig-md">{formatNepaliCurrency(monthlyTax)}</span>
              <span className="ml-1.5 text-[11px] text-ink-faint">est. monthly tax</span>
            </span>
          </div>
          <div className="sheet-bd">
            <div className="ledger mb-4">
              <LedgerRow label="Annual gross income" amount={annualGrossIncome} unit="Rs" tone="mute" />
              <LedgerRow label="Annual deductions" amount={annualDeductions} unit="Rs" tone="mute" />
              <LedgerRow label="Taxable income" amount={taxableIncome} unit="Rs" />
              <LedgerRow label="Est. monthly take-home" amount={monthlyTakeHome} unit="Rs" tone="gain" total large />
            </div>

            <div className="scroll-x">
              <table className="floor min-w-[36rem]">
                <thead>
                  <tr>
                    <th scope="col">Tax bracket</th>
                    <th scope="col" className="text-right">
                      Income in bracket
                    </th>
                    <th scope="col" className="text-right">
                      Rate
                    </th>
                    <th scope="col" className="text-right">
                      Estimated tax
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {taxLines.length ? (
                    taxLines.map((line) => (
                      <tr key={line.label}>
                        <td>{line.label}</td>
                        <td className="num fig-mute">{formatNepaliNumber(line.taxableAmount)}</td>
                        <td className="num">{(line.rate * 100).toFixed(0)}%</td>
                        <td className="num">{formatNepaliNumber(line.tax)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-ink-soft">
                        Enter income to see the bracket breakdown.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="border-t-2 border-rule-strong pt-2.5 font-medium text-ink">
                      Estimated annual income tax
                    </td>
                    <td className="num border-t-2 border-rule-strong pt-2.5 font-semibold">
                      {formatNepaliNumber(annualTax)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="note note-warn mt-4">
              This is an estimate for personal planning purposes only, not official tax advice.
              Consult a tax professional or the Inland Revenue Department for official figures.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
