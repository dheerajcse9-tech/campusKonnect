import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(16_20_42/0.04),0_8px_24px_-12px_rgb(16_20_42/0.08)] dark:shadow-none',
        className,
      )}
      {...rest}
    />
  );
}
