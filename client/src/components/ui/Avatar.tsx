import clsx from 'clsx';
import { initials } from '../../lib/format';

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-20 text-2xl' };

// A stable gradient per person so avatars without photos are still recognisable.
const gradients = [
  'from-brand-500 to-violet-600',
  'from-sky-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-fuchsia-500 to-purple-600',
];

function gradientFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return gradients[hash % gradients.length]!;
}

export function Avatar({
  name,
  url,
  size = 'md',
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof sizes;
}) {
  return url ? (
    <img
      src={url}
      alt=""
      className={clsx('shrink-0 rounded-full object-cover ring-2 ring-surface', sizes[size])}
    />
  ) : (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ring-2 ring-surface',
        gradientFor(name),
        sizes[size],
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}
