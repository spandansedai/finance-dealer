/**
 * @file components/LedgerRow.tsx
 * @description The core display primitive of the app: a single ruled line of a
 * bound account book — label on the left, dotted leader, figure right-aligned in
 * tabular monospace. Replaces the previous grid of identical metric cards.
 * See DESIGN.md §3.
 */

import React from 'react';
import { formatNepaliNumber } from '@/lib/calculations/finance';

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
  let figure: string;

  if (value !== undefined) {
    figure = value;
  } else if (amount !== undefined) {
    const negative = amount < 0;
    const body = formatNepaliNumber(Math.abs(amount));
    figure = negative ? `−${body}` : signed && amount > 0 ? `+${body}` : body;
  } else {
    figure = '0';
  }

  return (
    <div className={`ledger-row${total ? ' is-total' : ''}`}>
      <span className="lbl">
        {label}
        {tag ? <span className="tag ml-2">{tag}</span> : null}
      </span>
      <span className="leader" aria-hidden="true" />
      <span className="whitespace-nowrap">
        {unit ? <span className="unit">{unit}</span> : null}
        <span className={`fig ${large ? 'fig-lg' : 'fig-md'} ${TONE_CLASS[tone]}`}>{figure}</span>
      </span>
      {note ? <p className="ledger-note">{note}</p> : null}
    </div>
  );
};
