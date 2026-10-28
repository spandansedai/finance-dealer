/**
 * @file components/ui/Button.tsx
 * @description Buttons and button-styled links.
 *
 * Variants:
 * - `primary`   filled indigo, the one main action in a block
 * - `secondary` neutral outline (default)
 * - `warn`      marigold: locks, guest mode, reconciliation
 * - `danger`    destructive actions
 * - `link`      an inline text action; colour set by `tone`
 *
 * `type` is passed through untouched, so a button with no `type` inside a form
 * still submits it, exactly like a native <button>.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'warn' | 'danger' | 'link';
type Size = 'xs' | 'sm' | 'md' | 'lg';
type LinkTone = 'brand' | 'warn' | 'danger' | 'quiet';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  /** Full width. */
  block?: boolean;
  /** Text colour for `variant="link"`. */
  tone?: LinkTone;
}

const VARIANT_CLASS: Record<Exclude<Variant, 'link'>, string> = {
  primary: 'btn btn-ink',
  secondary: 'btn',
  warn: 'btn btn-warn',
  danger: 'btn btn-danger',
};

const BUTTON_SIZE: Record<Size, string | undefined> = { xs: 'btn-sm', sm: 'btn-sm', md: undefined, lg: 'btn-lg' };
const LINK_SIZE: Record<Size, string | undefined> = { xs: 'link-xs', sm: 'link-sm', md: undefined, lg: undefined };
const LINK_TONE: Record<LinkTone, string | undefined> = {
  brand: undefined,
  warn: 'link-warn',
  danger: 'link-danger',
  quiet: 'link-quiet',
};

export function buttonClass({ variant = 'secondary', size = 'md', block, tone = 'brand' }: StyleProps): string {
  if (variant === 'link') {
    return cn('link-ink', LINK_SIZE[size], LINK_TONE[tone]);
  }
  return cn(VARIANT_CLASS[variant], BUTTON_SIZE[size], block && 'btn-block');
}

export function Button({
  variant,
  size,
  block,
  tone,
  className,
  ...rest
}: StyleProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(buttonClass({ variant, size, block, tone }), className)} {...rest} />;
}

export function ButtonLink({
  variant,
  size,
  block,
  tone,
  className,
  ...rest
}: StyleProps & React.ComponentProps<typeof Link>) {
  return <Link className={cn(buttonClass({ variant, size, block, tone }), className)} {...rest} />;
}
