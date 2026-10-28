/**
 * @file components/ui/Modal.tsx
 * @description Dialog pieces: the dimmed overlay, the dialog box, and its
 * header, body and footer bands.
 */

import React from 'react';
import { cn } from './cn';

export function ModalOverlay({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('scrim', className)} {...rest} />;
}

export function Modal({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="dialog" aria-modal="true" className={cn('dialog', className)} {...rest} />;
}

export function ModalHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('dialog-hd', className)} {...rest} />;
}

export function ModalBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('dialog-bd', className)} {...rest} />;
}

export function ModalFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('dialog-ft', className)} {...rest} />;
}
