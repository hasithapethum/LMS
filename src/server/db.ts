import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { serverEnv } from './env';

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: serverEnv().DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in development; a fresh module scope is fine in production.
const globalForDb = globalThis as unknown as { db?: PrismaClient };

export const db: PrismaClient = globalForDb.db ?? createClient();

if (serverEnv().NODE_ENV !== 'production') globalForDb.db = db;
