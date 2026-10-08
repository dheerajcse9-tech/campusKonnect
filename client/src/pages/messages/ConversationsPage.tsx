import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router';
import { messagingApi } from '../../api/endpoints';
import { useCurrentUser } from '../../auth/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
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
        <FullPageSpinner />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="When a seller approves your request (or you approve someone's), you can chat here to arrange the meetup."
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {data.items.map((conversation) => (
            <li key={conversation.id}>
              <Link
                to={`/messages/${conversation.id}`}
                className="flex items-center gap-3 p-4 hover:bg-slate-50"
              >
                <Avatar
                  name={conversation.counterpart.name}
                  url={conversation.counterpart.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium">{conversation.counterpart.name}</p>
                    {conversation.lastMessage && (
                      <span className="shrink-0 text-xs text-slate-400">
                        {timeAgo(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">{conversation.listing.title}</p>
                  <p
                    className={`truncate text-sm ${conversation.unreadCount ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
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
