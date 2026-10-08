import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { PackageSearch, Search, SlidersHorizontal, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router';
import { listingsApi } from '../../api/endpoints';
import type { ListingCategory } from '../../api/types';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Pagination } from '../../components/ui/Pagination';
import { ListingGridSkeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { ListingCard, ListingGrid } from '../../features/marketplace/ListingCard';
import { CATEGORY_LABEL, CONDITION_LABEL } from '../../lib/format';

const FILTER_KEYS = [
  'q',
  'category',
  'type',
  'condition',
  'minPrice',
  'maxPrice',
  'sort',
  'page',
] as const;

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? undefined]));
  const [search, setSearch] = useState(query.q ?? '');
  const [showFilters, setShowFilters] = useState(false);

  const listings = useQuery({
    queryKey: ['listings', query],
    queryFn: () => listingsApi.list({ ...query, limit: 24 }),
    placeholderData: keepPreviousData,
  });

  /** Updates filters in the URL (shareable, back-button friendly) and resets to page 1. */
  function update(changes: Record<string, string | undefined>) {
    // Build from the browser's URL, not this render's copy: the router applies
    // navigations in a transition, so a quick second update (e.g. pick a category,
    // then search) would otherwise be computed from stale filters.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    update({ q: search.trim() || undefined });
  }

  const activeFilters = ['type', 'condition', 'minPrice', 'maxPrice'].filter((k) =>
    params.get(k),
  ).length;

  return (
    <div>
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-brand-gradient px-5 py-7 text-white shadow-xl shadow-brand-600/20 sm:px-10 sm:py-10">
        <div className="grid-pattern absolute inset-0 opacity-40" aria-hidden="true" />
        <div
          className="absolute -right-16 -top-16 size-64 rounded-full bg-white/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
            Your campus marketplace
          </h1>
          <p className="mt-2 text-sm text-white/80 sm:text-base">
            Buy, sell and rent with verified students. No strangers, no spam.
          </p>
          <form onSubmit={onSearch} className="mt-4 flex gap-2" role="search">
            <label htmlFor="search" className="sr-only">
              Search listings
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
              <input
                id="search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search books, cycles, calculators…"
                className="h-12 w-full rounded-xl border-0 bg-surface pl-10 pr-3 text-sm text-fg shadow-lg placeholder:text-fg-faint focus:outline-none focus:ring-4 focus:ring-white/40"
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-xl border border-white/30 bg-white/15 px-5 text-sm font-semibold backdrop-blur transition hover:bg-white/25 active:scale-95"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <div
        className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label="Categories"
      >
        {[undefined, ...(Object.keys(CATEGORY_LABEL) as ListingCategory[])].map((category) => {
          const active = (query.category ?? undefined) === category;
          return (
            <button
              key={category ?? 'all'}
              type="button"
              onClick={() => update({ category })}
              aria-pressed={active}
              className={clsx(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition',
                active
                  ? 'border-transparent bg-brand-gradient text-white shadow-md shadow-brand-600/25'
                  : 'border-line-strong bg-surface text-fg-2 hover:bg-surface-2',
              )}
            >
              {category ? CATEGORY_LABEL[category] : 'All'}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-4" /> Filters
          {activeFilters ? ` (${activeFilters})` : ''}
        </Button>
        {query.q && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1 text-sm text-brand-700 dark:text-brand-300">
            “{query.q}”
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch('');
                update({ q: undefined });
              }}
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}
        <div className="ml-auto">
          <label htmlFor="sort" className="sr-only">
            Sort by
          </label>
          <select
            id="sort"
            value={query.sort ?? 'newest'}
            onChange={(e) =>
              update({ sort: e.target.value === 'newest' ? undefined : e.target.value })
            }
            className="h-9 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-fg"
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="animate-rise mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-4">
          <Select
            label="Type"
            value={query.type ?? ''}
            onChange={(e) => update({ type: e.target.value || undefined })}
          >
            <option value="">Buy or rent</option>
            <option value="SELL">For sale</option>
            <option value="RENT">For rent</option>
          </Select>
          <Select
            label="Condition"
            value={query.condition ?? ''}
            onChange={(e) => update({ condition: e.target.value || undefined })}
          >
            <option value="">Any</option>
            {Object.entries(CONDITION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            key={`min-${query.minPrice ?? ''}`}
            label="Min price (₹)"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={query.minPrice}
            onBlur={(e) => update({ minPrice: e.target.value || undefined })}
          />
          <Input
            key={`max-${query.maxPrice ?? ''}`}
            label="Max price (₹)"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={query.maxPrice}
            onBlur={(e) => update({ maxPrice: e.target.value || undefined })}
          />
          {activeFilters > 0 && (
            <div className="col-span-2 sm:col-span-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  update({
                    type: undefined,
                    condition: undefined,
                    minPrice: undefined,
                    maxPrice: undefined,
                  })
                }
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      )}

      {listings.isPending ? (
        <ListingGridSkeleton />
      ) : listings.isError ? (
        <ErrorState error={listings.error} onRetry={() => void listings.refetch()} />
      ) : listings.data.items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Nothing here yet"
          description={
            query.q || query.category || activeFilters
              ? 'No listings match your search. Try different words or fewer filters.'
              : 'Be the first to list something your fellow students need.'
          }
          action={<ButtonLink to="/listings/new">List an item</ButtonLink>}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-fg-muted">
            {listings.data.total} {listings.data.total === 1 ? 'listing' : 'listings'}
          </p>
          <ListingGrid>
            {listings.data.items.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </ListingGrid>
          <Pagination
            page={listings.data.page}
            totalPages={listings.data.totalPages}
            onChange={(page) => {
              update({ page: String(page) });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}
