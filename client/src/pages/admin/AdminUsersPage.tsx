import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { adminApi } from '../../api/endpoints';
import type { AdminUser } from '../../api/types';
import { useCurrentUser } from '../../auth/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState, FormError } from '../../components/ui/States';
import { formatDate } from '../../lib/format';

function BanDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const ban = useMutation({
    mutationFn: () => adminApi.ban(user.id, reason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
  });
  return (
    <Modal open onClose={onClose} title={`Suspend ${user.name}?`}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          They will be signed out everywhere, their listings and posts will be hidden, and their
          open deals will be cancelled. You can lift the suspension later.
        </p>
        <FormError error={ban.error} />
        <Textarea
          label="Reason (recorded in the audit log)"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={ban.isPending}
            disabled={reason.trim().length < 5}
            onClick={() => ban.mutate()}
          >
            Suspend
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminUsersPage() {
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [banning, setBanning] = useState<AdminUser | null>(null);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['admin', 'users', search, status, page],
    queryFn: () => adminApi.users({ q: search, status, page }),
    placeholderData: keepPreviousData,
  });
  const unban = useMutation({
    mutationFn: (id: string) => adminApi.unban(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(q.trim());
    setPage(1);
  }

  return (
    <div>
      <form onSubmit={onSearch} className="mb-4 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search users by name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm"
        >
          <option value="">All users</option>
          <option value="ACTIVE">Active</option>
          <option value="BANNED">Suspended</option>
        </select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <FormError error={unban.error} />
      {isPending ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {data.items.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/users/${user.id}`} className="font-medium hover:underline">
                      {user.name}
                    </Link>
                    {user.role === 'ADMIN' && <Badge tone="brand">Admin</Badge>}
                    {user.status === 'BANNED' && <Badge tone="red">Suspended</Badge>}
                    {user.status === 'DELETED' && <Badge>Deleted</Badge>}
                    {!user.emailVerifiedAt && user.status === 'ACTIVE' && (
                      <Badge tone="amber">Unverified</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-slate-600">{user.email}</p>
                  <p className="text-xs text-slate-500">
                    {[user.department, user.year ? `Year ${user.year}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                    {user.department || user.year ? ' · ' : ''}Joined {formatDate(user.createdAt)} ·{' '}
                    {user._count.listings} listings · {user._count.posts} posts
                  </p>
                  {user.banReason && (
                    <p className="mt-1 text-xs text-red-700">Reason: {user.banReason}</p>
                  )}
                </div>
                {user.status === 'ACTIVE' && user.role !== 'ADMIN' && user.id !== me.id && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-red-600"
                    aria-label={`Suspend ${user.name}`}
                    onClick={() => setBanning(user)}
                  >
                    Suspend
                  </Button>
                )}
                {user.status === 'BANNED' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Lift suspension for ${user.name}`}
                    loading={unban.isPending && unban.variables === user.id}
                    onClick={() => unban.mutate(user.id)}
                  >
                    Lift suspension
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
      {banning && <BanDialog user={banning} onClose={() => setBanning(null)} />}
    </div>
  );
}
