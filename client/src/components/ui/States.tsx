import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '../../lib/errors';
import { Button } from './Button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-rise flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full bg-brand-gradient opacity-30 blur-xl"
          aria-hidden="true"
        />
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-brand-600/30">
          <Icon className="size-8" aria-hidden="true" />
        </div>
      </div>
      <h3 className="mt-5 text-lg font-bold text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center"
    >
      <AlertTriangle className="size-8 text-red-500" aria-hidden="true" />
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
    >
      {errorMessage(error)}
    </div>
  );
}
