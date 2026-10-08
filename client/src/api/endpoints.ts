import { api, type Session } from './client';
import type {
  AdminReport,
  AdminStats,
  AdminUser,
  AuditLogEntry,
  Comment,
  ConversationSummary,
  ConversationThread,
  ListingCard,
  ListingDetail,
  Me,
  Message,
  Notification,
  Paginated,
  Post,
  PostDetail,
  PublicProfile,
  ReportReason,
  ReportTargetType,
  RequestStatus,
  TransactionRequest,
  TransactionRequestDetail,
} from './types';

type Query = Record<string, string | number | boolean | undefined | null>;

export const authApi = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    department?: string;
    year?: number;
  }) => api<{ user: Me; message: string }>('/auth/register', { body, retryOnUnauthorized: false }),
  verifyEmail: (token: string) =>
    api<{ message: string }>('/auth/verify-email', { body: { token }, retryOnUnauthorized: false }),
  resendVerification: (email: string) =>
    api<{ message: string }>('/auth/resend-verification', {
      body: { email },
      retryOnUnauthorized: false,
    }),
  login: (email: string, password: string) =>
    api<Session>('/auth/login', { body: { email, password }, retryOnUnauthorized: false }),
  logout: () => api<void>('/auth/logout', { method: 'POST', retryOnUnauthorized: false }),
  forgotPassword: (email: string) =>
    api<{ message: string }>('/auth/forgot-password', {
      body: { email },
      retryOnUnauthorized: false,
    }),
  resetPassword: (token: string, password: string) =>
    api<{ message: string }>('/auth/reset-password', {
      body: { token, password },
      retryOnUnauthorized: false,
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ message: string }>('/auth/change-password', { body: { currentPassword, newPassword } }),
};

export const usersApi = {
  me: () => api<{ user: Me }>('/users/me'),
  update: (body: Partial<Pick<Me, 'name' | 'department' | 'year' | 'phone' | 'bio'>>) =>
    api<{ user: Me }>('/users/me', { method: 'PATCH', body }),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api<{ user: Me }>('/users/me/avatar', { body: form });
  },
  deleteAccount: (password: string) =>
    api<void>('/users/me/delete', { body: { password, confirm: 'DELETE' } }),
  profile: (id: string) => api<{ user: PublicProfile }>(`/users/${id}`),
};

export const listingsApi = {
  list: (query: Query) => api<Paginated<ListingCard>>('/listings', { query }),
  mine: () => api<{ items: ListingCard[] }>('/listings/mine'),
  get: (id: string) => api<{ listing: ListingDetail }>(`/listings/${id}`),
  create: (form: FormData) => api<{ listing: ListingDetail }>('/listings', { body: form }),
  update: (id: string, body: Record<string, unknown>) =>
    api<{ listing: ListingDetail }>(`/listings/${id}`, { method: 'PATCH', body }),
  addImages: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return api<{ listing: ListingDetail }>(`/listings/${id}/images`, { body: form });
  },
  removeImage: (id: string, imageId: string) =>
    api<{ listing: ListingDetail }>(`/listings/${id}/images/${imageId}`, { method: 'DELETE' }),
  setStatus: (id: string, status: 'ACTIVE' | 'SOLD') =>
    api<{ listing: ListingDetail }>(`/listings/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  remove: (id: string) => api<void>(`/listings/${id}`, { method: 'DELETE' }),
};

export const requestsApi = {
  create: (body: {
    listingId: string;
    message?: string;
    rentStartDate?: string;
    rentEndDate?: string;
  }) => api<{ request: TransactionRequest }>('/requests', { body }),
  list: (role: 'incoming' | 'outgoing', status?: RequestStatus) =>
    api<{ items: TransactionRequest[] }>('/requests', { query: { role, status } }),
  get: (id: string) => api<{ request: TransactionRequestDetail }>(`/requests/${id}`),
  act: (id: string, action: 'approve' | 'reject' | 'cancel' | 'complete') =>
    api<{ request: TransactionRequestDetail }>(`/requests/${id}/${action}`, { method: 'POST' }),
};

export const messagingApi = {
  conversations: () => api<{ items: ConversationSummary[] }>('/conversations'),
  thread: (id: string, after?: string) =>
    api<ConversationThread>(`/conversations/${id}/messages`, { query: { after } }),
  send: (id: string, body: string) =>
    api<{ message: Message }>(`/conversations/${id}/messages`, { body: { body } }),
};

export const notificationsApi = {
  list: (query: Query) =>
    api<Paginated<Notification> & { unreadCount: number }>('/notifications', { query }),
  unreadCount: () => api<{ unreadCount: number }>('/notifications/unread-count'),
  markRead: (id: string) => api<void>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => api<void>('/notifications/read-all', { method: 'POST' }),
};

export const communityApi = {
  list: (query: Query) => api<Paginated<Post>>('/posts', { query }),
  tags: () => api<{ items: { tag: string; count: number }[] }>('/posts/tags'),
  get: (id: string) => api<{ post: PostDetail }>(`/posts/${id}`),
  create: (body: { type: string; title: string; body: string; tags: string[] }) =>
    api<{ post: Post }>('/posts', { body }),
  update: (
    id: string,
    body: Partial<{ type: string; title: string; body: string; tags: string[] }>,
  ) => api<{ post: Post }>(`/posts/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => api<void>(`/posts/${id}`, { method: 'DELETE' }),
  upvote: (id: string) =>
    api<{ upvoted: boolean; upvoteCount: number }>(`/posts/${id}/upvote`, { method: 'POST' }),
  comment: (postId: string, body: string) =>
    api<{ comment: Comment }>(`/posts/${postId}/comments`, { body: { body } }),
  updateComment: (id: string, body: string) =>
    api<{ comment: Comment }>(`/comments/${id}`, { method: 'PATCH', body: { body } }),
  removeComment: (id: string) => api<void>(`/comments/${id}`, { method: 'DELETE' }),
  upvoteComment: (id: string) =>
    api<{ upvoted: boolean; upvoteCount: number }>(`/comments/${id}/upvote`, { method: 'POST' }),
};

export const reportsApi = {
  create: (body: {
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string;
  }) => api<{ report: { id: string } }>('/reports', { body }),
};

export const adminApi = {
  stats: () => api<AdminStats>('/admin/stats'),
  users: (query: Query) => api<Paginated<AdminUser>>('/admin/users', { query }),
  ban: (id: string, reason: string) => api<void>(`/admin/users/${id}/ban`, { body: { reason } }),
  unban: (id: string) => api<void>(`/admin/users/${id}/unban`, { method: 'POST' }),
  reports: (query: Query) => api<Paginated<AdminReport>>('/admin/reports', { query }),
  resolve: (id: string, body: { note?: string; removeContent: boolean; banUser: boolean }) =>
    api<void>(`/admin/reports/${id}/resolve`, { body }),
  dismiss: (id: string, note?: string) =>
    api<void>(`/admin/reports/${id}/dismiss`, { body: { note } }),
  removeContent: (type: 'listings' | 'posts' | 'comments', id: string, reason: string) =>
    api<void>(`/admin/${type}/${id}/remove`, { body: { reason } }),
  auditLogs: (query: Query) => api<Paginated<AuditLogEntry>>('/admin/audit-logs', { query }),
};
