import clsx from 'clsx';
import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'brand' | 'green' | 'amber' | 'red' | 'blue';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-fg-2 ring-line-strong/60',
  brand: 'bg-brand-500/10 text-brand-700 ring-brand-500/20 dark:text-brand-300',
  green: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300',
  red: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300',
  blue: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
