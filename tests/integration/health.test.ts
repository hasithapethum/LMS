import { describe, it, expect } from 'vitest';
import { checkHealth } from '@/server/health';

// The GET route only adds `await connection()` (request-time rendering), which needs a real
// request scope; it is checked end-to-end against the Docker image with curl.
describe('checkHealth', () => {
  it('reports app and database up', async () => {
    const res = await checkHealth();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: 'up' });
  });

  it('reports 503 when the database query fails', async () => {
    const res = await checkHealth(() => Promise.reject(new Error('connection refused')));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: 'down' });
  });
});
