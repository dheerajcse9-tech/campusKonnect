import { describe, expect, it } from 'vitest';
import {
  canTransition,
  isConnected,
  isTerminal,
  nextStatus,
} from '../src/modules/transactions/request-state.js';

describe('request state machine', () => {
  it('allows the documented transitions', () => {
    expect(nextStatus('PENDING', 'approve')).toBe('APPROVED');
    expect(nextStatus('PENDING', 'reject')).toBe('REJECTED');
    expect(nextStatus('PENDING', 'cancel')).toBe('CANCELLED');
    expect(nextStatus('APPROVED', 'cancel')).toBe('CANCELLED');
    expect(nextStatus('APPROVED', 'complete')).toBe('COMPLETED');
  });

  it('rejects illegal transitions with a conflict', () => {
    expect(() => nextStatus('PENDING', 'complete')).toThrow(/Cannot complete/);
    expect(() => nextStatus('APPROVED', 'approve')).toThrow();
    expect(canTransition('REJECTED', 'approve')).toBe(false);
  });

  it('has no way out of terminal states', () => {
    for (const status of ['REJECTED', 'CANCELLED', 'COMPLETED'] as const) {
      expect(isTerminal(status)).toBe(true);
      for (const action of ['approve', 'reject', 'cancel', 'complete'] as const) {
        expect(canTransition(status, action)).toBe(false);
      }
    }
    expect(isTerminal('PENDING')).toBe(false);
  });

  it('unlocks contact only after approval', () => {
    expect(isConnected('PENDING')).toBe(false);
    expect(isConnected('APPROVED')).toBe(true);
    expect(isConnected('COMPLETED')).toBe(true);
    expect(isConnected('REJECTED')).toBe(false);
  });
});
