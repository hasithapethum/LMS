import { describe, it, expect, afterAll } from 'vitest';
import { db } from '@/server/db';

const value = { paymentDay: 10, label: 'සිංහල' };

describe('database round-trip', () => {
  afterAll(async () => {
    await db.setting.deleteMany({ where: { key: 'm0.test' } });
    await db.$disconnect();
  });

  it('upserts and reads a Setting with a JSON value (Sinhala intact)', async () => {
    await db.setting.upsert({ where: { key: 'm0.test' }, create: { key: 'm0.test', value }, update: { value } });
    const row = await db.setting.findUniqueOrThrow({ where: { key: 'm0.test' } });
    expect(row.value).toEqual(value);
  });

  // Prisma's pg adapter rewrites every timestamptz offset to +00:00, so the session must be UTC
  // or every instant shifts by the session offset (5½ h for Asia/Colombo).
  it('reads a timestamptz instant back exactly', async () => {
    const [{ t }] = await db.$queryRaw<{ t: Date }[]>`SELECT '2026-12-01 03:00+05:30'::timestamptz AS t`;
    expect(t.toISOString()).toBe('2026-11-30T21:30:00.000Z');
  });

  it('database now() agrees with the app clock', async () => {
    const [{ t }] = await db.$queryRaw<{ t: Date }[]>`SELECT now() AS t`;
    expect(Math.abs(t.getTime() - Date.now())).toBeLessThan(60_000);
  });

  it('stores updatedAt as the real instant', async () => {
    const row = await db.setting.update({ where: { key: 'm0.test' }, data: { value } });
    expect(Math.abs(row.updatedAt.getTime() - Date.now())).toBeLessThan(60_000);
    const [{ t }] = await db.$queryRaw<{ t: Date }[]>`SELECT "updatedAt" AS t FROM settings WHERE key = 'm0.test'`;
    expect(Math.abs(t.getTime() - Date.now())).toBeLessThan(60_000);
  });
});
