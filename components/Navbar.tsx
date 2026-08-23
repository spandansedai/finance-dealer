'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navbar = () => {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/expenses', label: 'Expenses & Income' },
    { href: '/salary', label: 'Salary' },
    { href: '/portfolio', label: 'NEPSE Portfolio' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm shadow-sm">
              FD
            </span>
            <span>FinanceDealer</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 font-semibold border border-purple-300 dark:border-purple-800">
              v0.4
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/' || pathname === '/dashboard'
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation Quick Bar */}
        <div className="flex md:hidden items-center gap-2 text-xs">
          <Link
            href="/"
            className={`px-2.5 py-1 rounded-md ${
              pathname === '/' ? 'bg-zinc-200 dark:bg-zinc-800 font-bold' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/expenses"
            className={`px-2.5 py-1 rounded-md ${
              pathname.startsWith('/expenses') ? 'bg-zinc-200 dark:bg-zinc-800 font-bold' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Expenses
          </Link>
          <Link
            href="/portfolio"
            className={`px-2.5 py-1 rounded-md ${
              pathname.startsWith('/portfolio') ? 'bg-zinc-200 dark:bg-zinc-800 font-bold' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Portfolio
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="inline-block h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
          <span>Portfolio Engine v0.4 Ready</span>
        </div>
      </div>
    </header>
  );
};
