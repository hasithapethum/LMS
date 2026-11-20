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

  it('runs with the database session in Asia/Colombo', async () => {
    const [{ tz }] = await db.$queryRaw<{ tz: string }[]>`SELECT current_setting('TimeZone') AS tz`;
    expect(tz).toBe('Asia/Colombo');
  });
});
