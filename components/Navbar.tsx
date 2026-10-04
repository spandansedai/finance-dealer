/**
 * @file components/Navbar.tsx
 * @description Global application navigation header.
 * Displays brand identity, responsive desktop/mobile route links, active route indicators,
 * and live Supabase auth state (authenticated user email, sign in link, sign out action).
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Logomark } from '@/components/Logomark';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', short: 'Dashboard' },
  { href: '/expenses', label: 'Income & Expenses', short: 'Ledger' },
  { href: '/salary', label: 'Salary & Tax', short: 'Salary' },
  { href: '/portfolio', label: 'NEPSE', short: 'NEPSE' },
  { href: '/settings', label: 'Settings', short: 'Settings' },
];

/**
 * Navbar component providing sticky top navigation, live authentication status,
 * and responsive mobile quick links.
 */
export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Subscribe to Supabase auth state changes to dynamically update navbar email / auth buttons
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /**
   * Signs the current user out of Supabase and redirects to the login screen.
   */
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full overflow-hidden border-b border-rule-strong bg-paper/95 backdrop-blur-sm">
      {/* Row 1 — spine stamp, desktop tabs, auth */}
      <div className="mx-auto flex h-14 max-w-[88rem] items-center justify-between gap-3 px-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Logomark size={32} />
          <span className="font-display text-lg font-semibold leading-none text-ink">
            FinanceDealer
          </span>
        </Link>

        {/* Desktop tabs */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 md:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`border-b-2 px-2.5 py-1.5 text-[13px] transition-colors lg:px-3 ${
                  active
                    ? 'border-khata font-medium text-khata'
                    : 'border-transparent text-ink-soft hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth */}
        <div className="flex shrink-0 items-center gap-2">
          {userEmail ? (
            <>
              <span className="hidden max-w-[11rem] truncate border border-rule bg-sheet-alt px-2 py-1 font-mono text-[11px] text-ink-soft lg:inline-block">
                {userEmail}
              </span>
              <button type="button" onClick={handleSignOut} className="btn btn-sm">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-ink btn-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Row 2 — mobile tab strip. Its own row and its own scroll container, so
          long labels can never widen the page. */}
      <nav className="scroll-x no-bar border-t border-rule bg-sheet-alt md:hidden">
        <div className="flex w-max items-stretch">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 border-b-2 border-r border-r-rule px-3.5 py-2 text-xs transition-colors ${
                  active
                    ? 'border-b-khata bg-sheet font-medium text-khata'
                    : 'border-b-transparent text-ink-soft'
                }`}
              >
                {link.short}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
