/**
 * @jest-environment node
 */
import { createToken, verifyToken } from '@/lib/auth';

describe('auth tokens', () => {
  it('creates and verifies a valid token', () => {
    const token = createToken('user-1', 'patron', 'loc-1');
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe('user-1');
    expect(payload!.role).toBe('patron');
    expect(payload!.locationId).toBe('loc-1');
  });

  it('includes locationId in token payload', () => {
    const token = createToken('user-2', 'manager', 'loc-abc');
    const payload = verifyToken(token);
    expect(payload!.locationId).toBe('loc-abc');
  });

  it('handles null locationId', () => {
    const token = createToken('user-3', 'client');
    const payload = verifyToken(token);
    expect(payload!.locationId).toBeNull();
  });

  it('rejects tampered token', () => {
    const token = createToken('user-1', 'patron');
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(verifyToken(tampered)).toBeNull();
  });

  it('rejects empty string', () => {
    expect(verifyToken('')).toBeNull();
  });

  it('rejects malformed token (no dot)', () => {
    expect(verifyToken('nodothere')).toBeNull();
  });

  it('token has 24h expiry', () => {
    const token = createToken('user-1', 'patron');
    const payload = verifyToken(token);
    expect(payload!.exp).toBeGreaterThan(Date.now());
    expect(payload!.exp).toBeLessThanOrEqual(Date.now() + 86400001);
  });
});
