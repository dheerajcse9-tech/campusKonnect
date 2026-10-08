import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { type Size, type Variant, buttonClass } from './buttonStyles';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant,
  size,
  loading,
  disabled,
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className as string | undefined)} {...rest} />;
}
