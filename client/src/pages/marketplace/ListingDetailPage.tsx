import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, ImageOff, MapPin, Pencil, ShieldCheck, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { listingsApi } from '../../api/endpoints';
import type { ListingDetail } from '../../api/types';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { ErrorState, FormError } from '../../components/ui/States';
import { RequestItemModal } from '../../features/marketplace/RequestItemModal';
import { ReportButton } from '../../features/reports/ReportButton';
import {
  CATEGORY_LABEL,
  CONDITION_LABEL,
  LISTING_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
  formatListingPrice,
  formatPrice,
  timeAgo,
} from '../../lib/format';

function Gallery({ listing }: { listing: ListingDetail }) {
  const [index, setIndex] = useState(0);
  const images = listing.images;
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <ImageOff className="size-10" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
        <img src={images[index]?.url} alt={listing.title} className="size-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              className={clsx(
                'size-16 shrink-0 overflow-hidden rounded-lg border-2',
                i === index ? 'border-brand-600' : 'border-transparent',
              )}
            >
              <img src={image.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OwnerActions({ listing }: { listing: ListingDetail }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['listing', listing.id] });
    void queryClient.invalidateQueries({ queryKey: ['listings'] });
    void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
  };
  const status = useMutation({
    mutationFn: (next: 'ACTIVE' | 'SOLD') => listingsApi.setStatus(listing.id, next),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => listingsApi.remove(listing.id),
    onSuccess: () => {
      refresh();
      navigate('/my-listings', { replace: true });
    },
  });

  return (
    <div className="space-y-3">
      <FormError error={status.error} />
      {listing.status === 'RESERVED' && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          You approved a request for this item. Complete or cancel it from{' '}
          <Link to="/requests?tab=incoming" className="font-medium underline">
            your requests
          </Link>
          .
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <ButtonLink to={`/listings/${listing.id}/edit`} variant="secondary">
          <Pencil className="size-4" /> Edit
        </ButtonLink>
        <ButtonLink to="/requests?tab=incoming" variant="secondary">
          View requests
        </ButtonLink>
        {listing.status === 'ACTIVE' && (
          <Button
            variant="secondary"
            loading={status.isPending}
            onClick={() => status.mutate('SOLD')}
          >
            Mark as sold
          </Button>
        )}
        {listing.status === 'SOLD' && (
          <Button
            variant="secondary"
            loading={status.isPending}
            onClick={() => status.mutate('ACTIVE')}
          >
            Relist
          </Button>
        )}
        {listing.status !== 'RESERVED' && (
          <Button variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> Delete
          </Button>
        )}
      </div>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this listing?"
      >
        <p className="text-sm text-slate-600">
          It will be removed from the marketplace, and anyone with a pending request will be
          notified.
        </p>
        <FormError error={remove.error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Keep it
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function BuyerActions({ listing }: { listing: ListingDetail }) {
  const [open, setOpen] = useState(false);
  if (listing.viewerRequest) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-600">
          Your request is{' '}
          <strong>{REQUEST_STATUS_LABEL[listing.viewerRequest.status].toLowerCase()}</strong>.
        </p>
        <ButtonLink to={`/requests/${listing.viewerRequest.id}`} className="w-full">
          View your request
        </ButtonLink>
      </div>
    );
  }
  if (listing.status !== 'ACTIVE') {
    return (
      <p className="rounded-lg bg-slate-100 p-3 text-center text-sm text-slate-600">
        This item is {LISTING_STATUS_LABEL[listing.status].toLowerCase()} and not accepting
        requests.
      </p>
    );
  }
  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        {listing.type === 'RENT' ? 'Request to rent' : 'Request to buy'}
      </Button>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
        No contact details are shared until the seller approves.
      </p>
      <RequestItemModal listing={listing} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ListingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.get(id),
  });

  if (isPending) return <FullPageSpinner />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const listing = data.listing;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Back
      </button>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <Gallery listing={listing} />
          <Card className="mt-4 p-5">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {listing.description}
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap gap-1.5">
              {listing.type === 'RENT' ? (
                <Badge tone="blue">For rent</Badge>
              ) : (
                <Badge tone="brand">For sale</Badge>
              )}
              {listing.status !== 'ACTIVE' && (
                <Badge tone={listing.status === 'RESERVED' ? 'amber' : 'neutral'}>
                  {LISTING_STATUS_LABEL[listing.status]}
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-xl font-bold">{listing.title}</h1>
            <p className="mt-1 text-2xl font-bold text-brand-700">{formatListingPrice(listing)}</p>
            {listing.type === 'RENT' && (
              <p className="text-sm text-slate-600">
                {listing.deposit
                  ? `${formatPrice(listing.deposit)} refundable deposit`
                  : 'No deposit'}
              </p>
            )}
            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Tag className="size-4" aria-hidden="true" />
                <dt className="sr-only">Category and condition</dt>
                <dd>
                  {CATEGORY_LABEL[listing.category]} · {CONDITION_LABEL[listing.condition]}
                </dd>
              </div>
              {listing.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4" aria-hidden="true" />
                  <dt className="sr-only">Location</dt>
                  <dd>{listing.location}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-slate-400">Listed {timeAgo(listing.createdAt)}</p>
            <div className="mt-5">
              {listing.isOwner ? (
                <OwnerActions listing={listing} />
              ) : (
                <BuyerActions listing={listing} />
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Seller</p>
            <Link
              to={`/users/${listing.seller.id}`}
              className="mt-2 flex items-center gap-3 hover:opacity-80"
            >
              <Avatar name={listing.seller.name} url={listing.seller.avatarUrl} />
              <div>
                <p className="font-medium">{listing.seller.name}</p>
                <p className="text-xs text-slate-500">
                  {[
                    listing.seller.department,
                    listing.seller.year ? `Year ${listing.seller.year}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Verified student'}
                </p>
              </div>
            </Link>
          </Card>

          {!listing.isOwner && (
            <div className="flex justify-end">
              <ReportButton targetType="LISTING" targetId={listing.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
