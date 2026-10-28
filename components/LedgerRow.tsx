/**
 * @file components/LedgerRow.tsx
 * @description The core display primitive of the app: a single ruled line of a
 * bound account book — label on the left, dotted leader, figure right-aligned in
 * tabular monospace. Replaces the previous grid of identical metric cards.
 * See DESIGN.md §3.
 */

'use client';

import React from 'react';
import { CountUp } from '@/components/CountUp';
import { formatNepaliNumber } from '@/lib/calculations/finance';
import { Tag } from '@/components/ui';

type Tone = 'gain' | 'loss' | 'neutral' | 'mute';

interface LedgerRowProps {
  /** What the figure measures, in sentence case. */
  label: string;
  /** Raw NPR amount. Formatted with lakh grouping. Ignored if `value` is given. */
  amount?: number;
  /** Pre-formatted display string, for percentages and counts. */
  value?: string;
  /** Unit printed small before the figure, e.g. "Rs". Omit for percentages. */
  unit?: string;
  /** Colour of the figure. `gain`/`loss` are data signal only. */
  tone?: Tone;
  /** Prefix a `+` on positive figures so sign is never colour-only. */
  signed?: boolean;
  /** Small tag at the end of the label, e.g. "3 sources". */
  tag?: string;
  /** One line of explanation under the row. */
  note?: string;
  /** Close the block: double rule above, heavier label. */
  total?: boolean;
  /** Render the figure at display size. Use once or twice per block, not everywhere. */
  large?: boolean;
}

const TONE_CLASS: Record<Tone, string> = {
  gain: 'fig-gain',
  loss: 'fig-loss',
  neutral: '',
  mute: 'fig-mute',
};

/**
 * Renders one ruled ledger line.
 */
export const LedgerRow: React.FC<LedgerRowProps> = ({
  label,
  amount,
  value,
  unit,
  tone = 'neutral',
  signed = false,
  tag,
  note,
  total = false,
  large = false,
}) => {
  const formatAmount = (n: number) => {
    const body = formatNepaliNumber(Math.abs(n));
    return n < 0 ? `−${body}` : signed && n > 0 ? `+${body}` : body;
  };
  const figureClass = `fig ${large ? 'fig-lg' : 'fig-md'} ${TONE_CLASS[tone]}`;

  return (
    <div className={`ledger-row${total ? ' is-total' : ''}`}>
      <span className="lbl">
        {label}
        {tag ? <Tag className="ml-2">{tag}</Tag> : null}
      </span>
      <span className="leader" aria-hidden="true" />
      <span className={value !== undefined ? 'min-w-0 text-right' : 'whitespace-nowrap'}>
        {unit ? <span className="unit">{unit}</span> : null}
        {value !== undefined ? (
          // Text values (formulas, notes) may wrap on narrow screens; amounts never do.
          <span className={`${figureClass} whitespace-normal`}>{value}</span>
        ) : (
          <CountUp value={amount ?? 0} format={formatAmount} duration={700} className={figureClass} />
        )}
      </span>
      {note ? <p className="ledger-note">{note}</p> : null}
    </div>
  );
};
