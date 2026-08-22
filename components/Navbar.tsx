import Link from 'next/link';

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm">
              FD
            </span>
            <span>FinanceDealer</span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
              v0.1
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="/" className="transition hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold">
              Dashboard
            </Link>
            <Link href="/salary" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
              Salary
            </Link>
            <Link href="/expenses" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
              Expenses
            </Link>
            <Link href="/portfolio" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
              NEPSE Portfolio
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
          <span>NEPSE Market Ready</span>
        </div>
      </div>
    </header>
  );
};
