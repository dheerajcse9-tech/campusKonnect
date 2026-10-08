import { MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { ListingCard as ListingCardData } from '../../api/types';
import { Badge } from '../../components/ui/Badge';
import { CategoryArt } from './CategoryArt';
import {
  CONDITION_LABEL,
  LISTING_STATUS_LABEL,
  formatListingPrice,
  timeAgo,
} from '../../lib/format';

export function ListingCard({
  listing,
  showStatus = false,
  index = 0,
}: {
  listing: ListingCardData;
  showStatus?: boolean;
  /** Position in the grid, used to stagger the entrance animation. */
  index?: number;
}) {
  const image = listing.images[0]?.url;
  return (
    <Link
      to={`/listings/${listing.id}`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      className="group animate-rise overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-600/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-3">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <CategoryArt
            category={listing.category}
            className="transition duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {listing.type === 'RENT' && (
            <Badge tone="blue" className="bg-sky-500/90! text-white! ring-0!">
              For rent
            </Badge>
          )}
          {showStatus && listing.status !== 'ACTIVE' && (
            <Badge tone={listing.status === 'RESERVED' ? 'amber' : 'neutral'}>
              {LISTING_STATUS_LABEL[listing.status]}
            </Badge>
          )}
        </div>
        <span className="absolute bottom-2 left-2 rounded-full bg-slate-950/70 px-2.5 py-1 font-display text-sm font-extrabold text-white backdrop-blur-md">
          {formatListingPrice(listing)}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-fg group-hover:text-brand-700 dark:group-hover:text-brand-300">
          {listing.title}
        </h3>
        <p className="mt-2 flex items-center gap-1 truncate text-xs text-fg-muted">
          {CONDITION_LABEL[listing.condition]}
          {listing.location && (
            <>
              <span aria-hidden="true">·</span>
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{listing.location}</span>
            </>
          )}
        </p>
        <p className="mt-0.5 text-[11px] text-fg-faint">{timeAgo(listing.createdAt)}</p>
      </div>
    </Link>
  );
}

export function ListingGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{children}</div>
  );
}
