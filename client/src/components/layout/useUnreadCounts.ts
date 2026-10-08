import { useQuery } from '@tanstack/react-query';
import { messagingApi, notificationsApi } from '../../api/endpoints';

/** Badge counts for the navigation, polled while the app is open (ADR-0005). */
export function useUnreadCounts() {
  const notifications = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingApi.conversations,
    refetchInterval: 30_000,
  });
  return {
    notifications: notifications.data?.unreadCount ?? 0,
    messages: conversations.data?.items.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0,
  };
}
