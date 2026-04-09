import { api } from '@/lib/api';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => { mockFetch.mockClear(); });

describe('api client', () => {
  it('GET sends correct request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '1' }]),
    });

    const result = await api.get('/orders');
    expect(mockFetch).toHaveBeenCalledWith('/api/orders', expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }));
    expect(result).toEqual([{ id: '1' }]);
  });

  it('POST sends body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    await api.post('/auth', { action: 'login', email: 'test@test.com' });
    expect(mockFetch).toHaveBeenCalledWith('/api/auth', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'login', email: 'test@test.com' }),
    }));
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'bad_request' }),
    });

    await expect(api.get('/bad')).rejects.toEqual({ error: 'bad_request' });
  });
});
