import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { MessageSquare, Plus, Search, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { communityApi } from '../../api/endpoints';
import { useCurrentUser } from '../../auth/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { PostTypeBadge } from '../../features/community/PostTypeBadge';
import { UpvoteButton } from '../../features/community/UpvoteButton';
import { timeAgo } from '../../lib/format';

const TABS = [
  { label: 'All', value: undefined },
  { label: 'Ask a Senior', value: 'DOUBT' },
  { label: 'Discussions', value: 'DISCUSSION' },
] as const;

export function CommunityPage() {
  const me = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const query = {
    q: params.get('q') ?? undefined,
    type: params.get('type') ?? undefined,
    tag: params.get('tag') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: params.get('page') ?? undefined,
  };
  const [search, setSearch] = useState(query.q ?? '');

  const posts = useQuery({
    queryKey: ['posts', query],
    queryFn: () => communityApi.list({ ...query, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const tags = useQuery({
    queryKey: ['post-tags'],
    queryFn: communityApi.tags,
    staleTime: 5 * 60_000,
  });

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

  return (
    <div>
      <PageHeader
        title="Community"
        description="Ask seniors, share what you know. Every answer stays searchable for the next junior."
        action={
          <ButtonLink to="/community/new" size="sm">
            <Plus className="size-4" /> Ask or share
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <form onSubmit={onSearch} role="search" className="relative mb-3">
            <label htmlFor="post-search" className="sr-only">
              Search the community
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="post-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions, e.g. electives, internships, hostel"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </form>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                aria-pressed={query.type === tab.value}
                onClick={() => update({ type: tab.value })}
                className={clsx(
                  'rounded-full border px-3 py-1 text-sm font-medium',
                  query.type === tab.value
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700',
                )}
              >
                {tab.label}
              </button>
            ))}
            {query.tag && (
              <button
                type="button"
                onClick={() => update({ tag: undefined })}
                className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
                aria-label={`Remove tag filter ${query.tag}`}
              >
                #{query.tag} ×
              </button>
            )}
            <select
              aria-label="Sort posts"
              value={query.sort ?? 'newest'}
              onChange={(e) =>
                update({ sort: e.target.value === 'newest' ? undefined : e.target.value })
              }
              className="ml-auto h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="top">Most upvoted</option>
            </select>
          </div>

          {posts.isPending ? (
            <FullPageSpinner />
          ) : posts.isError ? (
            <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
          ) : posts.data.items.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No posts found"
              description={
                query.q || query.tag
                  ? 'Try another search, or be the first to ask.'
                  : 'Start the conversation: ask seniors anything.'
              }
              action={<ButtonLink to="/community/new">Ask a question</ButtonLink>}
            />
          ) : (
            <>
              <ul className="space-y-3">
                {posts.data.items.map((post) => (
                  <li
                    key={post.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                      <PostTypeBadge type={post.type} />
                      <span>
                        {post.author.name}
                        {post.author.year ? ` · Year ${post.author.year}` : ''} ·{' '}
                        {timeAgo(post.createdAt)}
                      </span>
                    </div>
                    <Link to={`/community/${post.id}`} className="block">
                      <h2 className="font-semibold text-slate-900 hover:text-brand-700">
                        {post.title}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{post.body}</p>
                    </Link>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <UpvoteButton
                        key={`${post.id}-${post.upvoteCount}-${post.viewerHasUpvoted}`}
                        count={post.upvoteCount}
                        upvoted={post.viewerHasUpvoted}
                        disabled={post.authorId === me.id}
                        onToggle={() => communityApi.upvote(post.id)}
                      />
                      <Link
                        to={`/community/${post.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        <MessageSquare className="size-4" aria-hidden="true" />
                        {post.commentCount}{' '}
                        {post.type === 'DOUBT'
                          ? post.commentCount === 1
                            ? 'answer'
                            : 'answers'
                          : 'comments'}
                      </Link>
                      {post.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => update({ tag })}
                          className="text-xs text-brand-700 hover:underline"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination
                page={posts.data.page}
                totalPages={posts.data.totalPages}
                onChange={(page) => update({ page: String(page) })}
              />
            </>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <Avatar name={me.name} url={me.avatarUrl} size="sm" />
                <p className="text-sm font-medium">Got a doubt, {me.name.split(' ')[0]}?</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">Seniors who've been there answer here.</p>
              <ButtonLink to="/community/new?type=DOUBT" size="sm" className="mt-3 w-full">
                Ask a Senior
              </ButtonLink>
            </div>
            {tags.data && tags.data.items.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold">Popular topics</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.data.items.map(({ tag, count }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => update({ tag })}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                    >
                      #{tag} <span className="text-slate-400">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
