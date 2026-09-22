/**
 * @file components/Logomark.tsx
 * @description The FinanceDealer mark — an ascending three-bar tile, echoing the
 * app's own floor-sheet/cash-flow bar charts rather than a generic wordmark or
 * a stock finance-app glyph. Used in the header, the footer, and mirrored as
 * the static favicon in app/icon.svg — keep the two in sync if this changes.
 */

import React from 'react';

interface LogomarkProps {
  size?: number;
  className?: string;
}

export const Logomark: React.FC<LogomarkProps> = ({ size = 32, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="FinanceDealer"
  >
    <rect width="32" height="32" rx="7" fill="var(--khata)" />
    <rect x="6" y="19" width="4" height="7" rx="1" fill="var(--on-khata)" />
    <rect x="13" y="14" width="4" height="12" rx="1" fill="var(--on-khata)" />
    <rect x="20" y="9" width="4" height="17" rx="1" fill="var(--on-khata)" />
  </svg>
);
