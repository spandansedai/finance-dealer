import Link from 'next/link';

export default function ExpensesPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold">Expense Tracker</h1>
            <p className="text-sm text-zinc-500">Record and monitor your daily and monthly expenditures.</p>
          </div>
          <Link href="/" className="text-sm font-medium text-emerald-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="p-8 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
          <p className="text-zinc-500 text-sm">Expense input forms module (Scheduled for v0.2)</p>
        </div>
      </div>
    </main>
  );
}
