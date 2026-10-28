/**
 * @file components/ui/Display.tsx
 * @description Headings, link tiles, headline KPI tiles, meters and colour
 * swatches.
 *
 * Meters and swatches are the only places in the app that set an inline style,
 * because their width or colour is data (a percentage, a chart series colour)
 * that cannot be known ahead of time as a Tailwind class.
 */

import React from 'react';
import Link from 'next/link';
import { cn, PolymorphicProps } from './cn';

type HeadingSize = 'lg' | 'md' | 'sm';
const HEADING_SIZE: Record<HeadingSize, string> = {
  lg: 'text-lg font-semibold tracking-tight',
  md: 'text-base font-semibold',
  sm: 'text-body font-semibold',
};

/** A heading outside a card header, e.g. an FAQ question or a footer column. */
export function Heading<E extends React.ElementType = 'h2'>({
  as,
  size = 'md',
  className,
  ...rest
}: PolymorphicProps<E> & { size?: HeadingSize }) {
  const Component: React.ElementType = as ?? 'h2';
  return <Component className={cn('font-display leading-snug text-ink', HEADING_SIZE[size], className)} {...rest} />;
}

/** A card that is itself a link: icon chip, title with arrow, short description. */
export function LinkTile({
  href,
  icon,
  title,
  children,
  titleAs = 'h3',
}: {
  href: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
  titleAs?: 'h2' | 'h3' | 'span';
}) {
  const Title = titleAs;
  return (
    <Link href={href} className="tile">
      <span className="tile-icon" aria-hidden="true">
        {icon}
      </span>
      <Title className="tile-title">{title}</Title>
      <span className="tile-body">{children}</span>
    </Link>
  );
}

type KpiTone = 'brand' | 'gain' | 'loss' | 'warn';
const KPI_TONE: Record<KpiTone, string | undefined> = {
  brand: undefined,
  gain: 'kpi-gain',
  loss: 'kpi-loss',
  warn: 'kpi-warn',
};

/** Responsive grid for KpiTiles: two columns on phones, four on desktop. */
export function KpiGrid<E extends React.ElementType = 'div'>({ as, className, ...rest }: PolymorphicProps<E>) {
  const Component: React.ElementType = as ?? 'div';
  return <Component className={cn('kpi-grid', className)} {...rest} />;
}

/** A headline figure tile with a tone-coloured top rail. */
export function KpiTile({
  label,
  value,
  valueClassName,
  footer,
  tone = 'brand',
  children,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
  footer?: React.ReactNode;
  tone?: KpiTone;
  /** Extra content between the value and the footer, e.g. a Meter. */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('kpi', KPI_TONE[tone])}>
      <span className="kpi-lbl">{label}</span>
      <span className={cn('kpi-val', valueClassName)}>{value}</span>
      {children}
      {footer && <span className="kpi-foot">{footer}</span>}
    </div>
  );
}

const clampPercent = (value: number) => `${Math.min(100, Math.max(0, value))}%`;

/** A progress rule that fills on load. */
export function Meter({
  percent,
  tone = 'brand',
  label,
}: {
  percent: number;
  tone?: KpiTone;
  /** Accessible description, e.g. "Savings rate 26% against a 20% guide". */
  label: string;
}) {
  return (
    <span className={cn('meter', tone !== 'brand' && `meter-${tone}`)} role="img" aria-label={label}>
      <span style={{ width: clampPercent(percent) }} />
    </span>
  );
}

/** The hairline weight bar in the NEPSE floor sheet. */
export function WeightBar({ percent }: { percent: number }) {
  return (
    <span className="weightbar" aria-hidden="true">
      <span style={{ width: clampPercent(percent) }} />
    </span>
  );
}

/** A small colour square keyed to a chart series. */
export function Swatch({ color, className }: { color: string; className?: string }) {
  return <span className={cn('h-2 w-2 shrink-0 rounded-sm', className)} style={{ backgroundColor: color }} aria-hidden="true" />;
}
