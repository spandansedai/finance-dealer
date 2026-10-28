/**
 * @file components/ui/Page.tsx
 * @description The frame every page sits in: `PageShell` sets the width,
 * gutters and vertical rhythm; `PageHeader` is the lit title band (masthead)
 * with an optional back link, description and actions.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from './cn';

interface PageShellProps {
  /** `wide` for data pages (ledger, NEPSE); `narrow` for reading pages. */
  width?: 'wide' | 'narrow';
  className?: string;
  children: React.ReactNode;
}

/**
 * Page container. Its direct children are the page's sections; they get even
 * spacing and rise in one after another on load (see `.page` in globals.css).
 * Modals can be rendered as children too: the overlay is fixed-position and
 * excluded from both the spacing and the entrance animation.
 */
export function PageShell({ width = 'wide', className, children }: PageShellProps) {
  return (
    <main className={cn('page', width === 'narrow' && 'page-narrow')}>
      <div className={cn('space-y-6', className)}>{children}</div>
    </main>
  );
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Shows a "← label" link above the title. */
  back?: { href: string; label: string };
  /** Right-hand side: stamps, tags, buttons. */
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  return (
    <header className="masthead">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="crumb">
            &larr; {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {description && <p className="masthead-note">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** The fiscal-period style pill used in page headers, e.g. "Updated | date". */
export function Stamp({ label, value, className }: { label: React.ReactNode; value?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('stamp', className)}>
      {label}
      {value !== undefined && (
        <>
          <span className="hair" aria-hidden="true" />
          {value}
        </>
      )}
    </span>
  );
}
