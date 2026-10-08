import clsx from 'clsx';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm' };

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}
