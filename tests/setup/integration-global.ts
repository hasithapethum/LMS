import 'dotenv/config';
import { execFileSync } from 'node:child_process';

/** Bring the test database schema up to date once before the integration suite. */
export default function setup(): void {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('DATABASE_URL_TEST is not set');
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
