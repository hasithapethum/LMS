import { connection } from 'next/server';
import { checkHealth } from '@/server/health';

/** Liveness + database check for Docker HEALTHCHECK and uptime monitors. Never prerendered. */
export async function GET(): Promise<Response> {
  await connection();
  return checkHealth();
}
