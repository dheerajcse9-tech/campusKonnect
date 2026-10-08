import clsx from 'clsx';
import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react';

const control =
  'block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-fg shadow-sm transition placeholder:text-fg-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-muted';

function controlClass(error?: string, className?: string) {
  return clsx(control, error ? 'border-red-400' : 'border-line-strong', className);
}

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-fg-2">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-fg-muted">{hint}</p>
      )}
    </div>
  );
}

type Common = { label?: string; hint?: ReactNode; error?: string };

export function Input({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <input
        id={fieldId}
        className={controlClass(error, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...rest}
      />
    </FieldShell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        id={fieldId}
        className={controlClass(error, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...rest}
      />
    </FieldShell>
  );
}

export function Select({
  label,
  hint,
  error,
  className,
  id,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <select
        id={fieldId}
        className={controlClass(error, className)}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}
