/**
 * @file components/ui/Form.tsx
 * @description Form controls. `numeric` sets figures in tabular mono,
 * right-aligned, as everywhere else money is shown.
 */

import React from 'react';
import { cn } from './cn';

/** A field label. Use `as="legend"` for the caption of a radio-group fieldset. */
export function Label({
  as,
  className,
  ...rest
}: { as?: 'label' | 'legend'; htmlFor?: string } & React.HTMLAttributes<HTMLElement>) {
  const Component: React.ElementType = as ?? 'label';
  return <Component className={cn('field-lbl', className)} {...rest} />;
}

export function FieldHint<E extends 'p' | 'span' = 'p'>({
  as,
  className,
  ...rest
}: { as?: E } & React.HTMLAttributes<HTMLElement>) {
  const Component: React.ElementType = as ?? 'p';
  return <Component className={cn('field-hint', className)} {...rest} />;
}

export function Input({
  numeric,
  className,
  ...rest
}: { numeric?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('field', numeric && 'field-num', className)} {...rest} />;
}

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('field', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('field', className)} {...rest} />;
}

/** An input with a currency/unit label printed into its left edge. */
export function AffixField({ prefix, children }: { prefix: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="field-wrap">
      <span className="prefix">{prefix}</span>
      {children}
    </div>
  );
}
