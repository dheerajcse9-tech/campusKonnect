import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { useParams } from 'react-router';
import { usersApi } from '../../api/endpoints';
import { useCurrentUser } from '../../auth/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { ListingCard, ListingGrid } from '../../features/marketplace/ListingCard';
import { ReportButton } from '../../features/reports/ReportButton';
import { formatDate } from '../../lib/format';

export function UserProfilePage() {
  const { id = '' } = useParams();
  const me = useCurrentUser();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => usersApi.profile(id),
  });

  if (isPending) return <FullPageSpinner />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const user = data.user;
  const isMe = user.id === me.id;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <Avatar name={user.name} url={user.avatarUrl} size="lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-xl font-bold">{user.name}</h1>
            <Badge tone="green">Verified student</Badge>
          </div>
          <p className="text-sm text-slate-600">
            {[user.department, user.year ? `Year ${user.year}` : null]
              .filter(Boolean)
              .join(' · ') || 'Student'}{' '}
            · Joined {formatDate(user.createdAt)}
          </p>
          {user.bio && <p className="mt-2 text-sm text-slate-700">{user.bio}</p>}
          <p className="mt-2 text-xs text-slate-500">
            {user.listings.length} active {user.listings.length === 1 ? 'listing' : 'listings'} ·{' '}
            {user.postCount} community {user.postCount === 1 ? 'post' : 'posts'}
          </p>
        </div>
        {isMe ? (
          <ButtonLink to="/profile" variant="secondary" size="sm">
            Edit profile
          </ButtonLink>
        ) : (
          <ReportButton targetType="USER" targetId={user.id} />
        )}
      </Card>

      <section>
        <h2 className="mb-3 font-semibold">Active listings</h2>
        {user.listings.length === 0 ? (
          <EmptyState icon={Package} title="No active listings" />
        ) : (
          <ListingGrid>
            {user.listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ListingGrid>
        )}
      </section>
    </div>
  );
}
