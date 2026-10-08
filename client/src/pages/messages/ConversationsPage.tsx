import { useQuery } from '@tanstack/react-query';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router';
import { messagingApi } from '../../api/endpoints';
import { useCurrentUser } from '../../auth/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { timeAgo } from '../../lib/format';

export function ConversationsPage() {
  const me = useCurrentUser();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingApi.conversations,
    refetchInterval: 15_000,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Messages" description="Chats open once a seller approves a request." />
      {isPending ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="When a seller approves your request (or you approve someone's), you can chat here to arrange the meetup."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {data.items.map((conversation) => (
            <li key={conversation.id}>
              <Link
                to={`/messages/${conversation.id}`}
                className="flex items-center gap-3 p-4 hover:bg-surface-2"
              >
                <Avatar
                  name={conversation.counterpart.name}
                  url={conversation.counterpart.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium">{conversation.counterpart.name}</p>
                    {conversation.lastMessage && (
                      <span className="shrink-0 text-xs text-fg-faint">
                        {timeAgo(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-fg-muted">{conversation.listing.title}</p>
                  <p
                    className={`truncate text-sm ${conversation.unreadCount ? 'font-semibold text-fg' : 'text-fg-muted'}`}
                  >
                    {conversation.lastMessage
                      ? `${conversation.lastMessage.senderId === me.id ? 'You: ' : ''}${conversation.lastMessage.body}`
                      : 'Say hello and arrange a time to meet'}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
