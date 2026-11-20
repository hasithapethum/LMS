import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

type Tree = { [key: string]: string | Tree };

const load = (locale: string): Tree =>
  JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8'));

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) };
  }, {});

const en = flatten(load('en'));
const si = flatten(load('si'));

describe('UI messages', () => {
  it('Sinhala has exactly the same keys as English', () =>
    expect(Object.keys(si).sort()).toEqual(Object.keys(en).sort()));

  it('no message is empty', () => {
    for (const [key, value] of Object.entries({ ...en, ...si })) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('language names are written in their own script', () => {
    expect(si['common.sinhala']).toBe('සිංහල');
    expect(en['common.english']).toBe('English');
  });
});
