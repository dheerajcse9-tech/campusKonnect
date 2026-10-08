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
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Icon className="size-10 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <AlertTriangle className="size-8 text-red-500" aria-hidden="true" />
      <p className="mt-2 text-sm text-red-700">{errorMessage(error)}</p>
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
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {errorMessage(error)}
    </div>
  );
}
