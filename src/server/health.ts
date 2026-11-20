import 'server-only';
import { db } from './db';

const pingDatabase = () => db.$queryRaw`SELECT 1`;

/** 200 `{ ok: true, db: 'up' }`, or 503 `{ ok: false, db: 'down' }` when the database is unreachable. */
export async function checkHealth(ping: () => Promise<unknown> = pingDatabase): Promise<Response> {
  try {
    await ping();
    return Response.json({ ok: true, db: 'up' });
  } catch {
    return Response.json({ ok: false, db: 'down' }, { status: 503 });
  }
}
