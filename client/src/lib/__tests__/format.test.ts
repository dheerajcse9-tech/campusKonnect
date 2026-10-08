import { describe, expect, it } from 'vitest';
import { formatListingPrice, formatPrice, initials, timeAgo } from '../format';

describe('formatting', () => {
  it('formats rupees and rent periods', () => {
    expect(formatPrice(2500)).toBe('₹2,500');
    expect(formatPrice(150000)).toBe('₹1,50,000');
    expect(formatPrice(0)).toBe('Free');
    expect(formatListingPrice({ price: 40, type: 'RENT', rentPeriod: 'WEEK' })).toBe('₹40 / week');
    expect(formatListingPrice({ price: 350, type: 'SELL', rentPeriod: null })).toBe('₹350');
  });

  it('describes relative times', () => {
    const now = new Date('2026-01-10T12:00:00Z');
    expect(timeAgo('2026-01-10T11:59:50Z', now)).toBe('just now');
    expect(timeAgo('2026-01-10T09:00:00Z', now)).toBe('3 hours ago');
    expect(timeAgo('2026-01-09T12:00:00Z', now)).toBe('yesterday');
  });

  it('derives initials', () => {
    expect(initials('Asha Rao')).toBe('AR');
    expect(initials('  vikram  ')).toBe('V');
  });
});
