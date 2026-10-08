import { useQuery } from '@tanstack/react-query';
import { ListingGridSkeleton } from '../../components/ui/Skeleton';
import { Package, Plus } from 'lucide-react';
import { listingsApi } from '../../api/endpoints';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { ListingCard, ListingGrid } from '../../features/marketplace/ListingCard';

export function MyListingsPage() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['my-listings'],
    queryFn: listingsApi.mine,
  });

  return (
    <div>
      <PageHeader
        title="My listings"
        description="Everything you're selling or renting out."
        action={
          <ButtonLink to="/listings/new" size="sm">
            <Plus className="size-4" /> New listing
          </ButtonLink>
        }
      />
      {isPending ? (
        <ListingGridSkeleton count={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="You haven't listed anything yet"
          description="Books, cycles, calculators, furniture: give your stuff a second owner."
          action={<ButtonLink to="/listings/new">List an item</ButtonLink>}
        />
      ) : (
        <ListingGrid>
          {data.items.map((listing) => (
            <div key={listing.id} className="relative">
              <ListingCard listing={listing} showStatus />
              {(listing._count?.requests ?? 0) > 0 && (
                <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {listing._count!.requests} new{' '}
                  {listing._count!.requests === 1 ? 'request' : 'requests'}
                </span>
              )}
            </div>
          ))}
        </ListingGrid>
      )}
    </div>
  );
}
