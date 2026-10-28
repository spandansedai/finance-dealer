/**
 * @file components/ui/Feedback.tsx
 * @description Notices, tags, empty states and loading skeletons.
 */

import React from 'react';
import { cn, PolymorphicProps } from './cn';

type Tone = 'neutral' | 'brand' | 'warn' | 'gain' | 'loss';

const NOTICE_TONE: Record<Tone, string | undefined> = {
  neutral: undefined,
  brand: 'note-khata',
  warn: 'note-warn',
  gain: 'note-gain',
  loss: 'note-loss',
};

/** A bordered message strip: guest mode, errors, confirmations. */
export function Notice<E extends React.ElementType = 'div'>({
  as,
  tone = 'neutral',
  className,
  ...rest
}: PolymorphicProps<E> & { tone?: Tone }) {
  const Component: React.ElementType = as ?? 'div';
  return <Component className={cn('note', NOTICE_TONE[tone], className)} {...rest} />;
}

const TAG_TONE: Record<Tone, string | undefined> = {
  neutral: undefined,
  brand: 'tag-khata',
  warn: 'tag-warn',
  gain: 'tag-gain',
  loss: 'tag-loss',
};

/** A small mono pill for categories, counts and statuses. */
export function Tag<E extends React.ElementType = 'span'>({
  as,
  tone = 'neutral',
  className,
  ...rest
}: PolymorphicProps<E> & { tone?: Tone }) {
  const Component: React.ElementType = as ?? 'span';
  return <Component className={cn('tag', TAG_TONE[tone], className)} {...rest} />;
}

export function EmptyState({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('empty', className)} {...rest} />;
}
export function EmptyMark({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('empty-mark', className)} aria-hidden="true" {...rest} />;
}
export function EmptyTitle({
  as,
  className,
  ...rest
}: { as?: 'p' | 'h2' | 'h3' } & React.HTMLAttributes<HTMLHeadingElement>) {
  const Component: React.ElementType = as ?? 'p';
  return <Component className={cn('empty-title', className)} {...rest} />;
}
export function EmptyBody({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('empty-body', className)} {...rest} />;
}

/** A shimmering placeholder block; size it with Tailwind width/height classes. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('skeleton', className)} />;
}
