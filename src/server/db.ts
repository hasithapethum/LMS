import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { serverEnv } from './env';

function createClient(): PrismaClient {
  // UTC session on every connection: @prisma/adapter-pg rewrites timestamptz offsets to +00:00,
  // so any other session zone shifts instants. Colombo logic lives in src/lib/time.ts and in
  // explicit `AT TIME ZONE 'Asia/Colombo'` SQL (architecture plan §16).
  const adapter = new PrismaPg({ connectionString: serverEnv().DATABASE_URL, options: '-c TimeZone=UTC' });
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in development; a fresh module scope is fine in production.
const globalForDb = globalThis as unknown as { db?: PrismaClient };

export const db: PrismaClient = globalForDb.db ?? createClient();

if (serverEnv().NODE_ENV !== 'production') globalForDb.db = db;
