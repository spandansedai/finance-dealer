/**
 * @file components/ui/Card.tsx
 * @description The sheet: the app's card surface, with optional header, body
 * and footer bands. Every boxed section on every page is built from these.
 */

import React from 'react';
import { cn, PolymorphicProps } from './cn';

export function Card<E extends React.ElementType = 'div'>({ as, className, ...rest }: PolymorphicProps<E>) {
  const Component: React.ElementType = as ?? 'div';
  return <Component className={cn('sheet', className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('sheet-hd', className)} {...rest} />;
}

export function CardTitle<E extends React.ElementType = 'h2'>({ as, className, ...rest }: PolymorphicProps<E>) {
  const Component: React.ElementType = as ?? 'h2';
  return <Component className={cn('sheet-title', className)} {...rest} />;
}

export function CardSubtitle<E extends React.ElementType = 'p'>({ as, className, ...rest }: PolymorphicProps<E>) {
  const Component: React.ElementType = as ?? 'p';
  return <Component className={cn('sheet-sub', className)} {...rest} />;
}

export function CardBody<E extends React.ElementType = 'div'>({ as, className, ...rest }: PolymorphicProps<E>) {
  const Component: React.ElementType = as ?? 'div';
  return <Component className={cn('sheet-bd', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('sheet-ft', className)} {...rest} />;
}

/**
 * An inset box inside a card: account tiles, chart stat boxes, read-only
 * summaries. `raised` floats it above content instead (chart tooltips).
 */
export function Panel<E extends React.ElementType = 'div'>({
  as,
  raised,
  className,
  ...rest
}: PolymorphicProps<E> & { raised?: boolean }) {
  const Component: React.ElementType = as ?? 'div';
  return <Component className={cn('panel', raised && 'panel-raised', className)} {...rest} />;
}
