import clsx from 'clsx';
import { initials } from '../../lib/format';

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-20 text-2xl' };

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
    <img src={url} alt="" className={clsx('shrink-0 rounded-full object-cover', sizes[size])} />
  ) : (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700',
        sizes[size],
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}
