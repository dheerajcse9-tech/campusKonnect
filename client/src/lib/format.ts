import type {
  ItemCondition,
  ListingCategory,
  ListingStatus,
  RentPeriod,
  ReportReason,
  RequestStatus,
} from '../api/types';

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return amount === 0 ? 'Free' : rupees.format(amount);
}

export const RENT_PERIOD_LABEL: Record<RentPeriod, string> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

export function formatListingPrice(listing: {
  price: number;
  type: string;
  rentPeriod: RentPeriod | null;
}): string {
  if (listing.type === 'RENT' && listing.rentPeriod) {
    return `${formatPrice(listing.price)} / ${RENT_PERIOD_LABEL[listing.rentPeriod]}`;
  }
  return formatPrice(listing.price);
}

export const CATEGORY_LABEL: Record<ListingCategory, string> = {
  BOOKS: 'Books',
  ELECTRONICS: 'Electronics',
  CYCLES: 'Cycles',
  FURNITURE: 'Furniture',
  CLOTHING: 'Clothing',
  STATIONERY: 'Stationery',
  SPORTS: 'Sports',
  HOSTEL_ESSENTIALS: 'Hostel essentials',
  OTHER: 'Other',
};

export const CONDITION_LABEL: Record<ItemCondition, string> = {
  NEW: 'New',
  LIKE_NEW: 'Like new',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
};

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  ACTIVE: 'Available',
  RESERVED: 'Reserved',
  SOLD: 'Sold',
  REMOVED: 'Removed',
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Declined',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  SPAM: 'Spam',
  SCAM: 'Scam or fraud',
  INAPPROPRIATE: 'Inappropriate content',
  HARASSMENT: 'Harassment',
  PROHIBITED_ITEM: 'Prohibited item',
  OTHER: 'Something else',
};

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 hours ago", "yesterday", "just now". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Today's date as YYYY-MM-DD in the user's own time zone (for date inputs). */
export function todayInputValue(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
