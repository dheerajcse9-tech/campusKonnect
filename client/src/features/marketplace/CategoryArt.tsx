import clsx from 'clsx';
import {
  Armchair,
  BedDouble,
  Bike,
  BookOpen,
  Laptop,
  type LucideIcon,
  Package,
  PenTool,
  Shirt,
  Trophy,
} from 'lucide-react';
import type { ListingCategory } from '../../api/types';

const ART: Record<ListingCategory, { icon: LucideIcon; gradient: string }> = {
  BOOKS: { icon: BookOpen, gradient: 'from-amber-400 via-orange-500 to-rose-500' },
  ELECTRONICS: { icon: Laptop, gradient: 'from-sky-400 via-blue-500 to-indigo-600' },
  CYCLES: { icon: Bike, gradient: 'from-emerald-400 via-teal-500 to-cyan-600' },
  FURNITURE: { icon: Armchair, gradient: 'from-orange-300 via-amber-500 to-yellow-600' },
  CLOTHING: { icon: Shirt, gradient: 'from-pink-400 via-fuchsia-500 to-purple-600' },
  STATIONERY: { icon: PenTool, gradient: 'from-violet-400 via-purple-500 to-indigo-600' },
  SPORTS: { icon: Trophy, gradient: 'from-lime-400 via-green-500 to-emerald-600' },
  HOSTEL_ESSENTIALS: { icon: BedDouble, gradient: 'from-cyan-400 via-sky-500 to-blue-600' },
  OTHER: { icon: Package, gradient: 'from-slate-400 via-slate-500 to-slate-600' },
};

/** Placeholder artwork for listings without photos, so the feed never looks broken. */
export function CategoryArt({
  category,
  className,
}: {
  category: ListingCategory;
  className?: string;
}) {
  const { icon: Icon, gradient } = ART[category];
  return (
    <div
      className={clsx(
        'relative flex size-full items-center justify-center overflow-hidden bg-gradient-to-br',
        gradient,
        className,
      )}
      aria-hidden="true"
    >
      <div className="grid-pattern absolute inset-0 opacity-50" />
      <Icon
        className="absolute -bottom-4 -right-4 size-28 rotate-[-12deg] text-white/15"
        strokeWidth={1.5}
      />
      <Icon className="relative size-12 text-white drop-shadow-lg" strokeWidth={1.75} />
    </div>
  );
}
