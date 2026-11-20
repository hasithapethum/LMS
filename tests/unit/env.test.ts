import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseServerEnv } from '@/server/env';

describe('parseServerEnv', () => {
  it('accepts a postgres URL', () =>
    expect(parseServerEnv({ DATABASE_URL: 'postgresql://a:b@localhost:5432/x', NODE_ENV: 'test' }).DATABASE_URL)
      .toBe('postgresql://a:b@localhost:5432/x'));

  it('accepts the short postgres:// scheme', () =>
    expect(parseServerEnv({ DATABASE_URL: 'postgres://a@h/x' }).DATABASE_URL).toBe('postgres://a@h/x'));

  it('fails clearly without DATABASE_URL', () =>
    expect(() => parseServerEnv({ NODE_ENV: 'test' })).toThrow('DATABASE_URL is not set'));

  it('treats an empty DATABASE_URL as missing', () =>
    expect(() => parseServerEnv({ DATABASE_URL: '  ' })).toThrow('DATABASE_URL is not set'));

  it('rejects a non-postgres URL', () =>
    expect(() => parseServerEnv({ DATABASE_URL: 'mysql://x', NODE_ENV: 'test' }))
      .toThrow('DATABASE_URL must start with postgresql://'));

  it('defaults NODE_ENV to development', () =>
    expect(parseServerEnv({ DATABASE_URL: 'postgresql://a@h/x' }).NODE_ENV).toBe('development'));
});
