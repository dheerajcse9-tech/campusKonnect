import clsx from 'clsx';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
export type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-brand-500 via-brand-600 to-violet-600 text-white shadow-lg shadow-brand-600/25 hover:shadow-xl hover:shadow-brand-600/30 hover:brightness-110',
  secondary:
    'border border-line-strong bg-surface text-fg shadow-sm hover:border-brand-400 hover:bg-surface-2',
  ghost: 'text-fg-2 hover:bg-surface-3',
  danger:
    'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-600/20 hover:brightness-110',
  glass: 'border border-white/30 bg-white/15 text-white backdrop-blur-md hover:bg-white/25',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}
