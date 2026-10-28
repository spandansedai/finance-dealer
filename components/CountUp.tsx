/**
 * @file components/CountUp.tsx
 * @description A figure that counts up from its previous value to the new one
 * with an ease-out curve. Purely presentational: the final rendered text is
 * always exactly `format(value)`. Skips the animation for users who prefer
 * reduced motion.
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  /** Turns the in-flight number into display text, e.g. lakh-grouped rupees. */
  format: (value: number) => string;
  /** Animation length in milliseconds. */
  duration?: number;
  className?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const CountUp: React.FC<CountUpProps> = ({ value, format, duration = 900, className }) => {
  // Starts at zero (matching the server render) and counts up on mount.
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || from === value) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Whole numbers while in flight so decimals don't flicker; exact at rest.
      setDisplay(t < 1 ? Math.round(from + (value - from) * easeOutCubic(t)) : value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
};
