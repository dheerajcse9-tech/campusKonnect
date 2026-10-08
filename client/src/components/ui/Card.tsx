import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}
      {...rest}
    />
  );
}
