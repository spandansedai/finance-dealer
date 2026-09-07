'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/expenses', label: 'Expenses & Income' },
    { href: '/salary', label: 'Salary' },
    { href: '/portfolio', label: 'NEPSE Portfolio' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm shadow-sm">
              FD
            </span>
            <span className="font-bold">FinanceDealer</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800 hidden xs:inline-block">
              v0.6
            </span>
          </Link>

          {/* Desktop Nav Links */}
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

        {/* Desktop Auth Section */}
        <div className="hidden md:flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {userEmail ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="max-w-[160px] truncate font-medium text-zinc-700 dark:text-zinc-300">
                {userEmail}
              </span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-xs"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Header Controls */}
        <div className="flex md:hidden items-center gap-2">
          {userEmail ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium max-w-[130px] truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">{userEmail.split('@')[0]}</span>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium text-xs shadow-xs"
            >
              Sign In
            </Link>
          )}

          {/* Hamburger / Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="p-2 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-hidden transition cursor-pointer"
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 space-y-2 shadow-lg">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/' || pathname === '/dashboard'
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">•</span>}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Auth Details inside menu */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
            {userEmail ? (
              <div className="space-y-2">
                <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                  <span className="truncate font-medium">Signed in as {userEmail}</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm text-center shadow-xs transition"
              >
                Sign In to FinanceDealer
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
