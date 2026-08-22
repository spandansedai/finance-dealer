import Link from 'next/link';

export default function SalaryPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold">Salary & Income Management</h1>
            <p className="text-sm text-zinc-500">Configure recurring salary, allowances, and tax brackets.</p>
          </div>
          <Link href="/" className="text-sm font-medium text-emerald-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="p-8 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
          <p className="text-zinc-500 text-sm">Salary tracking module placeholder (Scheduled for future release)</p>
        </div>
      </div>
    </main>
  );
}
