import { ImageOff } from 'lucide-react';
import { Link } from 'react-router';
import type { ListingCard as ListingCardData } from '../../api/types';
import { Badge } from '../../components/ui/Badge';
import {
  CONDITION_LABEL,
  LISTING_STATUS_LABEL,
  formatListingPrice,
  timeAgo,
} from '../../lib/format';

export function ListingCard({
  listing,
  showStatus = false,
}: {
  listing: ListingCardData;
  showStatus?: boolean;
}) {
  const image = listing.images[0]?.url;
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        {image ? (
          <img src={image} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-400">
            <ImageOff className="size-8" aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {listing.type === 'RENT' && <Badge tone="blue">For rent</Badge>}
          {showStatus && listing.status !== 'ACTIVE' && (
            <Badge tone={listing.status === 'RESERVED' ? 'amber' : 'neutral'}>
              {LISTING_STATUS_LABEL[listing.status]}
            </Badge>
          )}
        </div>
      </div>
      <div className="p-3">
        <p className="text-base font-bold text-slate-900">{formatListingPrice(listing)}</p>
        <h3 className="mt-0.5 line-clamp-2 text-sm text-slate-700 group-hover:text-brand-700">
          {listing.title}
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          {CONDITION_LABEL[listing.condition]}
          {listing.location ? ` · ${listing.location}` : ''} · {timeAgo(listing.createdAt)}
        </p>
      </div>
    </Link>
  );
}

export function ListingGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{children}</div>
  );
}
