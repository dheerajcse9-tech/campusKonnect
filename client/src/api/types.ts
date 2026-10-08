// Types mirroring the API responses (docs/04-api-design.md).

export type Role = 'STUDENT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BANNED' | 'DELETED';
export type ListingType = 'SELL' | 'RENT';
export type ListingCategory =
  | 'BOOKS'
  | 'ELECTRONICS'
  | 'CYCLES'
  | 'FURNITURE'
  | 'CLOTHING'
  | 'STATIONERY'
  | 'SPORTS'
  | 'HOSTEL_ESSENTIALS'
  | 'OTHER';
export type ItemCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type ListingStatus = 'ACTIVE' | 'RESERVED' | 'SOLD' | 'REMOVED';
export type RentPeriod = 'DAY' | 'WEEK' | 'MONTH';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type PostType = 'DISCUSSION' | 'DOUBT';
export type ReportTargetType = 'USER' | 'LISTING' | 'POST' | 'COMMENT';
export type ReportReason =
  'SPAM' | 'SCAM' | 'INAPPROPRIATE' | 'HARASSMENT' | 'PROHIBITED_ITEM' | 'OTHER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  department: string | null;
  year: number | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  department?: string | null;
  year?: number | null;
}

export interface PublicProfile extends UserSummary {
  bio: string | null;
  createdAt: string;
  postCount: number;
  listings: ListingCard[];
}

export interface ListingImage {
  id: string;
  url: string;
  position?: number;
}

export interface ListingCard {
  id: string;
  title: string;
  type: ListingType;
  category: ListingCategory;
  condition: ItemCondition;
  price: number;
  rentPeriod: RentPeriod | null;
  deposit: number | null;
  location: string | null;
  status: ListingStatus;
  createdAt: string;
  images: ListingImage[];
  seller: UserSummary;
  _count?: { requests: number };
}

export interface ListingDetail extends ListingCard {
  description: string;
  sellerId: string;
  updatedAt: string;
  isOwner: boolean;
  viewerRequest: { id: string; status: RequestStatus } | null;
}

export interface TransactionRequest {
  id: string;
  type: ListingType;
  status: RequestStatus;
  message: string | null;
  rentStartDate: string | null;
  rentEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  completedAt: string | null;
  requesterId: string;
  sellerId: string;
  listing: ListingCard;
  requester: UserSummary;
  seller: UserSummary;
  conversation: { id: string } | null;
}

export interface TransactionRequestDetail extends TransactionRequest {
  viewerRole: 'seller' | 'requester' | null;
  contact: { name: string; email: string; phone: string | null } | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  updatedAt: string;
  request: { id: string; status: RequestStatus };
  listing: { id: string; title: string; images: { url: string }[] };
  counterpart: UserSummary;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface ConversationThread {
  conversation: {
    id: string;
    request: { id: string; status: RequestStatus; type: ListingType };
    listing: { id: string; title: string; price: number; images: { url: string }[] };
    counterpart: UserSummary;
    canSend: boolean;
  };
  messages: Message[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  body: string;
  tags: string[];
  upvoteCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: UserSummary;
  viewerHasUpvoted: boolean;
}

export interface Comment {
  id: string;
  body: string;
  upvoteCount: number;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: UserSummary;
  viewerHasUpvoted: boolean;
  isAuthor: boolean;
  isPostAuthor: boolean;
}

export interface PostDetail extends Post {
  isAuthor: boolean;
  comments: Comment[];
}

export interface AdminStats {
  users: { total: number; banned: number; newThisWeek: number };
  listings: { active: number; sold: number };
  requests: { pending: number; completed: number };
  community: { posts: number; comments: number };
  reports: { open: number };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  department: string | null;
  year: number | null;
  role: Role;
  status: UserStatus;
  banReason: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  _count: { listings: number; posts: number };
}

export interface AdminReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { id: string; name: string; email: string };
  resolvedBy: { id: string; name: string } | null;
  target: {
    type: ReportTargetType;
    id: string;
    ownerId: string;
    label: string;
    link: string;
    active: boolean;
  } | null;
  openReportsOnTarget: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
}
