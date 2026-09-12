'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Sticky top navigation shown on every page (rendered once in app/layout.tsx).
 * Shows the desktop nav + auth controls inline on md screens and up, and
 * collapses into a hamburger-triggered dropdown menu on smaller screens.
 */
export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // Controls the collapsible mobile menu (hidden by default, opened via the hamburger button below md).
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setIsMobileMenuOpen(false);
    await supabase.auth.signOut();
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
        <div className="flex items-center gap-6 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 shrink-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm shadow-sm">
              FD
            </span>
            {/* Full brand name is hidden on the smallest screens to leave room for the nav controls; the icon above is always shown. */}
            <span className="font-bold hidden sm:inline">FinanceDealer</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-300 dark:border-emerald-800 hidden sm:inline-block">
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

        {/* Desktop Auth Controls */}
        <div className="hidden md:flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {userEmail ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="max-w-[160px] truncate font-medium text-zinc-700 dark:text-zinc-300">{userEmail}</span>
              <button
                onClick={handleSignOut}
                className="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors shadow-xs"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle (hamburger). Replaces the old single-row mobile bar that overflowed small screens. */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          className="flex md:hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Dropdown Menu: stacked links + auth control, shown below the header bar instead of squeezed into it. */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 space-y-1">
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
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800">
            {userEmail ? (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">{userEmail}</span>
                <button
                  onClick={handleSignOut}
                  className="shrink-0 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
