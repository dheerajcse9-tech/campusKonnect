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
import { FullPageSpinner } from '../../components/ui/Spinner';
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
    const next = new URLSearchParams(params);
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
      <section className="mb-6 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-800 px-5 py-6 text-white sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Your campus marketplace</h1>
        <p className="mt-1 text-sm text-indigo-100 sm:text-base">
          Buy, sell and rent with verified students. No strangers, no spam.
        </p>
        <form onSubmit={onSearch} className="mt-4 flex gap-2" role="search">
          <label htmlFor="search" className="sr-only">
            Search listings
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search books, cycles, calculators…"
              className="h-11 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-lg bg-white/15 px-4 text-sm font-semibold hover:bg-white/25"
          >
            Search
          </button>
        </form>
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
                'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium',
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
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
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
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
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
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
        <FullPageSpinner />
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
          <p className="mb-3 text-sm text-slate-500">
            {listings.data.total} {listings.data.total === 1 ? 'listing' : 'listings'}
          </p>
          <ListingGrid>
            {listings.data.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
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
