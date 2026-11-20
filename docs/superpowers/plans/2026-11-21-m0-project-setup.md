# M0 — Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A runnable, tested Next.js 16 skeleton for the A/L LMS with Asia/Colombo time helpers, EN/SI i18n, the navy theme, Prisma on PostgreSQL 17 and a production Docker image.

**Architecture:** Single Next.js App Router app at the repo root. Pure helpers live in `src/lib` and are unit-tested with Vitest. Server-only code lives in `src/server`. Postgres runs in Docker Compose for dev and integration tests. The production image uses Next `standalone` output.

**Tech Stack:** Node 22, Next.js 16.4.6, React 19, TypeScript 6.0.3 (strict), Tailwind CSS 4, shadcn/ui, next-intl 4, next-themes, Prisma 7.10.1 + `@prisma/adapter-pg`, PostgreSQL 17, `@date-fns/tz`, Zod 4, Vitest 5, npm.

**Spec:** `docs/01-architecture-plan.md` (§2, §14, §16, §17, §18 M0) and `docs/02-ui-ux-plan.md` (§2, §6).

## Global Constraints

- Node 22 (`.nvmrc` = `22`). Package manager: npm.
- Pinned: `next@16.4.6`, `prisma@7.10.1`, `@prisma/client@7.10.1`, `@prisma/adapter-pg@7.10.1`, `typescript@6.0.3` (not 7.x: Next's build-time type check is unverified on the TS 7 native compiler).
- TypeScript `strict: true`.
- All date/month logic uses time zone `Asia/Colombo` and must give the same result whatever the host `TZ` is.
- Months are strings `YYYY-MM`.
- Locales: `en`, `si`. Cookie `NEXT_LOCALE`, no URL prefix. `<html lang>` equals the active locale.
- Brand: `navy-800` = `#000080`. Token values exactly as in UI plan §2.1.
- Sinhala uses the system font stack `"Noto Sans Sinhala", "Sinhala Sangam MN", "Nirmala UI", "Iskoola Pota", sans-serif`. No Sinhala web font download.
- `.env` is never committed. `.env.example` is committed.
- Dev Postgres binds to `127.0.0.1` only. Postgres data lives in a Docker **named volume** (the repo is on NTFS/ntfs-3g).
- Git: `core.fileMode false` (NTFS reports every file as executable). Commit to local branch `feat/m0-setup`. Never push.

## Review Focus

1. **Host time zone is not Colombo** (UTC VPS, CI runner, a developer abroad): helpers must still return Colombo months and instants. The Vitest setup forces `TZ=America/New_York` (Task 2).
2. **Month and year boundaries** (30 Nov 23:59:59 Colombo, Dec → Jan rollover, payment day at exactly 00:00): the student would expect access to end at that instant, not 5½ hours early or late. Exact-instant tests in Task 2.
3. **A Sinhala message key is missing**: the page should never show a raw key. A parity test across `en.json` and `si.json` (Task 3).
4. **The locale cookie holds garbage** (`fr`, empty, `si-LK`, `<script>`): the app falls back safely, and `si-LK` maps to `si`. Tests in Task 3.
5. **The app starts without `DATABASE_URL`**: it should fail with a clear message, not a deep Prisma stack trace. Test in Task 4.

---

## File map

| Path | Responsibility | Task |
|---|---|---|
| `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `.nvmrc`, `.gitignore`, `.env.example` | Project config | 1, 3, 4, 5 |
| `vitest.config.mts`, `tests/setup/force-foreign-tz.ts` | Unit test runner, forces non-Colombo TZ | 2 |
| `src/lib/time.ts` | Asia/Colombo month and instant helpers, access window math | 2 |
| `tests/unit/time.test.ts` | Time helper tests | 2 |
| `src/i18n/locale.ts` | `resolveLocale`, locale constants | 3 |
| `src/i18n/request.ts` | next-intl request config (reads cookie) | 3 |
| `messages/en.json`, `messages/si.json` | UI strings | 3 |
| `src/app/actions/locale.ts` | Server action that sets the locale cookie | 3 |
| `src/app/globals.css` | Tailwind v4 theme tokens, light/dark, Sinhala font rules | 3 |
| `src/app/layout.tsx`, `src/app/page.tsx` | Root layout, placeholder home | 3 |
| `src/components/language-toggle.tsx` | EN / සිං switch | 3 |
| `src/components/theme-provider.tsx` | next-themes wrapper (system default) | 3 |
| `tests/unit/locale.test.ts`, `tests/unit/messages.test.ts` | Locale and message parity tests | 3 |
| `compose.yaml`, `docker/postgres/init/01-test-db.sql` | Dev Postgres 17 + `lms_test` DB | 4 |
| `prisma/schema.prisma`, `prisma.config.ts` | Prisma 7 schema (first model: `Setting`) | 4 |
| `src/server/env.ts` | Zod-validated server env | 4 |
| `src/server/db.ts` | Prisma client singleton with pg adapter | 4 |
| `vitest.integration.config.mts`, `tests/setup/integration-global.ts` | Integration runner, migrates test DB | 4 |
| `tests/unit/env.test.ts`, `tests/integration/db.test.ts` | Env + DB round-trip tests | 4 |
| `src/app/api/health/route.ts` | Health check (app + DB) | 5 |
| `tests/integration/health.test.ts` | Health route test | 5 |
| `Dockerfile`, `.dockerignore` | Production image (standalone) | 5 |
| `.github/workflows/ci.yml` | CI skeleton | 5 |
| `docs/01-architecture-plan.md` §14 | Note `src/lib/time.ts` location | 2 |

---

### Task 1: Scaffold Next.js app and git repository

**Files:**
- Create: everything generated by `create-next-app`, `.nvmrc`, `.env.example` (empty placeholder header for now)
- Modify: `package.json` (scripts, TS pin), `.gitignore`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck`; path alias `@/*` → `src/*`.

- [ ] **Step 1: Initialise git and commit the approved docs on `main`**

```bash
cd /media/hasitha/NewVolume1/LMS
git init -b main
git config core.fileMode false
git add docs
git commit -m "docs: approved architecture and UI/UX plans (rev 2) and M0 plan"
git switch -c feat/m0-setup
```
Expected: one commit on `main`; now on branch `feat/m0-setup`.

- [ ] **Step 2: Scaffold in the scratchpad**

The folder name `LMS` is not a valid npm package name, so scaffold as `al-lms` elsewhere and copy:
```bash
SCRATCH=/tmp/claude-1000/-media-hasitha-NewVolume1-LMS/67709846-aefd-4afc-975f-a2b44498c7d6/scratchpad
cd "$SCRATCH" && rm -rf al-lms
npx --yes create-next-app@16.4.6 al-lms --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --skip-install --disable-git --yes
rsync -a --exclude node_modules --exclude .git "$SCRATCH/al-lms/" /media/hasitha/NewVolume1/LMS/
```
If a flag is rejected by this `create-next-app` version, drop that flag and accept its default; App Router, TypeScript, Tailwind, ESLint, `src/` and `@/*` are required.

- [ ] **Step 3: Pin TypeScript, add scripts and Node version**

In `package.json`: set `"name": "al-lms"`, devDependency `"typescript": "6.0.3"`, add script `"typecheck": "tsc --noEmit"`. Create `.nvmrc` containing `22`. Ensure `.gitignore` ignores `.env*` but **not** `.env.example` (add `!.env.example`).

- [ ] **Step 4: Install and verify**

Run: `npm install && npm run lint && npm run typecheck && npm run build`
Expected: all four exit 0; build output lists route `/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 app (TS 6, Tailwind 4, ESLint)"
```

---

### Task 2: Asia/Colombo time helpers (Vitest set up here)

**Files:**
- Create: `vitest.config.mts`, `tests/setup/force-foreign-tz.ts`, `src/lib/time.ts`, `tests/unit/time.test.ts`
- Modify: `package.json` (scripts `test`, `test:watch`; devDeps `vitest`, `@date-fns/tz`, `date-fns`), `docs/01-architecture-plan.md` §14 (replace `time.ts (Asia/Colombo helpers)` under `server/` with a note that time helpers live in `src/lib/time.ts` because client countdowns use them too)

**Interfaces:**
- Produces (all exported from `@/lib/time`):
  - `APP_TIME_ZONE: 'Asia/Colombo'`
  - `type MonthKey = string` (validated `YYYY-MM`)
  - `type AppLocale = 'en' | 'si'`
  - `isMonthKey(value: string): value is MonthKey`
  - `monthKeyOf(instant: Date): MonthKey`
  - `addMonths(month: MonthKey, n: number): MonthKey`
  - `startOfMonthInstant(month: MonthKey): Date`
  - `paymentDayInstant(month: MonthKey, paymentDay: number): Date` (RangeError unless integer 1–28)
  - `accessWindow(paidMonth: MonthKey, paymentDay: number): { start: Date; end: Date }`
  - `isWithinAccessWindow(paidMonth: MonthKey, paymentDay: number, now: Date): boolean`
  - `payableMonths(now: Date, ahead?: number): MonthKey[]` (default `ahead = 2`)
  - `formatInColombo(instant: Date, locale: AppLocale, options: Intl.DateTimeFormatOptions): string` (locale tags `en-LK` / `si-LK`)
  - `parseColomboDateTime(local: string): Date` (input `YYYY-MM-DDTHH:mm` from `<input type="datetime-local">`; RangeError on bad input)

- [ ] **Step 1: Configure Vitest**

`vitest.config.mts`: `test.include = ['tests/unit/**/*.test.ts']`, `test.environment = 'node'`, `test.setupFiles = ['tests/setup/force-foreign-tz.ts']`, `resolve.alias` `@` → `./src`. The setup file sets `process.env.TZ = 'America/New_York'`. Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Write the failing tests** in `tests/unit/time.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  APP_TIME_ZONE, isMonthKey, monthKeyOf, addMonths, startOfMonthInstant, paymentDayInstant,
  accessWindow, isWithinAccessWindow, payableMonths, formatInColombo, parseColomboDateTime,
} from '@/lib/time';

const at = (iso: string) => new Date(iso);

describe('host TZ guard', () => {
  it('runs under a non-Colombo host zone', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/New_York');
    expect(APP_TIME_ZONE).toBe('Asia/Colombo');
  });
});

describe('isMonthKey', () => {
  it.each(['2026-01', '2026-12'])('accepts %s', (v) => expect(isMonthKey(v)).toBe(true));
  it.each(['2026-13', '2026-00', '2026-1', '26-01', '2026/01', ''])('rejects %s', (v) =>
    expect(isMonthKey(v)).toBe(false));
});

describe('monthKeyOf', () => {
  it('30 Nov 23:59:59 Colombo is still November', () =>
    expect(monthKeyOf(at('2026-11-30T18:29:59Z'))).toBe('2026-11'));
  it('1 Dec 00:00 Colombo is December', () =>
    expect(monthKeyOf(at('2026-11-30T18:30:00Z'))).toBe('2026-12'));
  it('New Year in Colombo', () =>
    expect(monthKeyOf(at('2026-12-31T18:30:00Z'))).toBe('2027-01'));
});

describe('addMonths', () => {
  it('rolls over the year', () => expect(addMonths('2026-12', 1)).toBe('2027-01'));
  it('goes backwards across the year', () => expect(addMonths('2027-01', -1)).toBe('2026-12'));
  it('adds more than 12', () => expect(addMonths('2026-11', 14)).toBe('2028-01'));
  it('rejects a bad month key', () => expect(() => addMonths('2026-13', 1)).toThrow(RangeError));
});

describe('instants', () => {
  it('start of December in Colombo', () =>
    expect(startOfMonthInstant('2026-12').toISOString()).toBe('2026-11-30T18:30:00.000Z'));
  it('payment day 10 of December', () =>
    expect(paymentDayInstant('2026-12', 10).toISOString()).toBe('2026-12-09T18:30:00.000Z'));
  it.each([0, 29, 10.5, -1])('rejects payment day %s', (d) =>
    expect(() => paymentDayInstant('2026-12', d)).toThrow(RangeError));
});

describe('access window (paid month M → payment day of M+1)', () => {
  it('November paid, payment day 10', () => {
    const w = accessWindow('2026-11', 10);
    expect(w.start.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(w.end.toISOString()).toBe('2026-12-09T18:30:00.000Z');
  });
  it('December paid rolls into January', () =>
    expect(accessWindow('2026-12', 1).end.toISOString()).toBe('2026-12-31T18:30:00.000Z'));
  it('inside one second before the end', () =>
    expect(isWithinAccessWindow('2026-11', 10, at('2026-12-09T18:29:59Z'))).toBe(true));
  it('outside exactly at the end', () =>
    expect(isWithinAccessWindow('2026-11', 10, at('2026-12-09T18:30:00Z'))).toBe(false));
  it('outside one second before the start', () =>
    expect(isWithinAccessWindow('2026-11', 10, at('2026-10-31T18:29:59Z'))).toBe(false));
  it('inside exactly at the start', () =>
    expect(isWithinAccessWindow('2026-11', 10, at('2026-10-31T18:30:00Z'))).toBe(true));
});

describe('payableMonths', () => {
  it('current + 2 ahead across the year', () =>
    expect(payableMonths(at('2026-12-15T00:00:00Z'))).toEqual(['2026-12', '2027-01', '2027-02']));
  it('uses Colombo month at the boundary', () =>
    expect(payableMonths(at('2026-11-30T18:30:00Z'), 0)).toEqual(['2026-12']));
});

describe('formatInColombo', () => {
  const dec1 = at('2026-11-30T18:30:00Z');
  it('English month name in Colombo time', () =>
    expect(formatInColombo(dec1, 'en', { month: 'long' })).toBe('December'));
  it('Sinhala month name', () =>
    expect(formatInColombo(dec1, 'si', { month: 'long' })).toBe('දෙසැම්බර්'));
  it('day number in Colombo time', () =>
    expect(formatInColombo(dec1, 'en', { day: 'numeric' })).toBe('1'));
});

describe('parseColomboDateTime', () => {
  it('reads datetime-local as Colombo time', () =>
    expect(parseColomboDateTime('2026-12-01T00:00').toISOString()).toBe('2026-11-30T18:30:00.000Z'));
  it.each(['', '2026-12-01', '2026-13-01T00:00', 'yesterday'])('rejects %s', (v) =>
    expect(() => parseColomboDateTime(v)).toThrow(RangeError));
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm i -D vitest @date-fns/tz date-fns && npm test`
Expected: FAIL — cannot resolve `@/lib/time`.

- [ ] **Step 4: Implement `src/lib/time.ts`** with the signatures in the Interfaces block. Use `TZDate` from `@date-fns/tz` (or `Intl` parts) for zone conversion. Never read the host zone.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all time tests PASS; typecheck and lint exit 0.

- [ ] **Step 6: Update architecture doc §14** as listed under Files.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(time): Asia/Colombo month, access-window and formatting helpers"
```

---

### Task 3: i18n (EN/SI), navy theme and base layout

**Files:**
- Create: `src/i18n/locale.ts`, `src/i18n/request.ts`, `messages/en.json`, `messages/si.json`, `src/app/actions/locale.ts`, `src/components/language-toggle.tsx`, `src/components/theme-provider.tsx`, `tests/unit/locale.test.ts`, `tests/unit/messages.test.ts`
- Modify: `next.config.ts` (next-intl plugin), `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `package.json` (deps `next-intl`, `next-themes`; shadcn adds its own)

**Interfaces:**
- Consumes: `AppLocale` from `@/lib/time`.
- Produces:
  - `@/i18n/locale`: `LOCALES: readonly ['en', 'si']`, `DEFAULT_LOCALE: 'en'`, `LOCALE_COOKIE: 'NEXT_LOCALE'`, `resolveLocale(raw: string | undefined | null): AppLocale`
  - `@/app/actions/locale`: `setLocale(locale: AppLocale): Promise<void>` (server action; cookie `NEXT_LOCALE`, `maxAge` 1 year, `sameSite: 'lax'`, `path: '/'`)
  - `<LanguageToggle />` client component
  - Tailwind colour utilities `navy-50`…`navy-950`, `gold-400`, `success-600`, `warning-600`, `danger-600`, `live-500`; shadcn semantic vars (`--primary` etc.)
  - Message namespaces `common`, `home`

- [ ] **Step 1: Write the failing tests**

`tests/unit/locale.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveLocale, LOCALES, DEFAULT_LOCALE } from '@/i18n/locale';

describe('resolveLocale', () => {
  it.each([
    ['en', 'en'], ['si', 'si'], ['si-LK', 'si'], ['SI', 'si'], ['en-GB', 'en'],
    ['fr', 'en'], ['', 'en'], [undefined, 'en'], [null, 'en'], ['<script>', 'en'],
  ])('%s → %s', (raw, expected) => expect(resolveLocale(raw as string | undefined | null)).toBe(expected));
  it('exposes en and si with en default', () => {
    expect(LOCALES).toEqual(['en', 'si']);
    expect(DEFAULT_LOCALE).toBe('en');
  });
});
```

`tests/unit/messages.test.ts`: load both JSON files, flatten to dotted key paths, and assert:
- `Object.keys(flat(si)).sort()` equals `Object.keys(flat(en)).sort()`
- no value in either file is an empty string
- `si.common.sinhala === 'සිංහල'` and `en.common.english === 'English'`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/i18n/locale` / message files.

- [ ] **Step 3: Implement locale + messages**

- `resolveLocale`: lowercase, take the language subtag before `-`, return it if in `LOCALES`, else `DEFAULT_LOCALE`.
- Messages (Sinhala strings are placeholders for native review):

| Key | en | si |
|---|---|---|
| `common.appName` | `A/L LMS` | `A/L LMS` |
| `common.language` | `Language` | `භාෂාව` |
| `common.english` | `English` | `English` |
| `common.sinhala` | `සිංහල` | `සිංහල` |
| `home.title` | `Learn A/L the smart way` | `A/L පහසුවෙන් ඉගෙන ගන්න` |
| `home.cta` | `Get started` | `ආරම්භ කරන්න` |

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Wire next-intl, theme and layout**

1. `npm i next-intl next-themes`. Wrap `next.config.ts` with `createNextIntlPlugin('./src/i18n/request.ts')`.
2. `request.ts` reads the `NEXT_LOCALE` cookie via `cookies()`, applies `resolveLocale`, and loads `messages/<locale>.json`.
3. `npx shadcn@4.23.0 init -d`, then `npx shadcn@4.23.0 add button`.
4. In `globals.css`:
   - Replace shadcn's colour variables with UI plan §2.1 values.
     - Light: `--primary #000080`, `--primary-foreground #FFFFFF`, `--ring #6670E0`, `--background #F7F8FC`, `--card #FFFFFF`, `--foreground #0F172A`, `--muted-foreground #475569`, `--border #E2E8F0`.
     - `.dark`: `--background #0B0B1F`, `--card #14142E`, `--primary #3B43C2`, `--foreground #F1F5F9`.
   - Add the `navy`/`gold`/`success`/`warning`/`danger`/`live` scales under `@theme`.
   - Add rule `:lang(si) body { font-family: "Noto Sans Sinhala", "Sinhala Sangam MN", "Nirmala UI", "Iskoola Pota", sans-serif; line-height: 1.75; }`.
   - Inputs `font-size: max(16px, 1rem)`.
5. `layout.tsx`:
   - `<html lang={locale} suppressHydrationWarning>`.
   - Inter via `next/font/google` (`subsets: ['latin']`).
   - `NextIntlClientProvider`.
   - `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`).
6. `page.tsx`: `home.title` heading, a primary `Button` with `home.cta`, and `<LanguageToggle />`. The toggle calls `setLocale` and `router.refresh()`. It renders `EN | සිං` with `aria-label={t('common.language')}`.

- [ ] **Step 6: Verify in the real app**

Run:
```bash
npm run build && (npm start -- -p 3100 & echo $! > /tmp/lms-next.pid) && sleep 5
curl -s localhost:3100 | grep -o '<html lang="en"'
curl -s -H 'Cookie: NEXT_LOCALE=si' localhost:3100 | grep -o '<html lang="si"\|A/L පහසුවෙන් ඉගෙන ගන්න'
curl -s -H 'Cookie: NEXT_LOCALE=fr' localhost:3100 | grep -o '<html lang="en"'
kill $(cat /tmp/lms-next.pid)
```
Expected: the 1st and 3rd commands print `<html lang="en"`. The 2nd prints both `<html lang="si"` and the Sinhala title.
Then `npm test && npm run typecheck && npm run lint` exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(i18n,theme): EN/SI cookie locale, navy tokens, base layout"
```

---

### Task 4: PostgreSQL 17 + Prisma 7 + validated env

**Files:**
- Create: `compose.yaml`, `docker/postgres/init/01-test-db.sql`, `prisma/schema.prisma`, `prisma.config.ts`, `src/server/env.ts`, `src/server/db.ts`, `vitest.integration.config.mts`, `tests/setup/integration-global.ts`, `tests/unit/env.test.ts`, `tests/integration/db.test.ts`, `.env.example`
- Modify: `package.json` (deps `prisma@7.10.1` dev, `@prisma/client@7.10.1`, `@prisma/adapter-pg@7.10.1`, `pg`, `zod`, `server-only`; scripts below), `.gitignore` (`src/generated/`)

**Interfaces:**
- Produces:
  - `@/server/env`: `parseServerEnv(source: Record<string, string | undefined>): ServerEnv` and `serverEnv(): ServerEnv` (memoised over `process.env`). `ServerEnv = { DATABASE_URL: string; NODE_ENV: 'development' | 'test' | 'production' }`.
  - `@/server/db`: `db: PrismaClient` (singleton, `PrismaPg` adapter, cached on `globalThis` outside production). The file starts with `import 'server-only'`.
  - Prisma model `Setting { key String @id; value Json; updatedAt DateTime @updatedAt }` (table `settings`).
  - Scripts: `db:up` (`docker compose up -d postgres`), `db:migrate` (`prisma migrate dev`), `db:generate` (`prisma generate`), `test:integration` (`vitest run -c vitest.integration.config.mts`), `postinstall` (`prisma generate`).

- [ ] **Step 1: Compose + env example**

`compose.yaml`:
- Service `postgres`, image `postgres:17-alpine`.
- `POSTGRES_USER=lms`, `POSTGRES_PASSWORD=lms`, `POSTGRES_DB=lms`, `TZ=Asia/Colombo`.
- `command: ["postgres", "-c", "timezone=Asia/Colombo"]`. This makes the session zone explicit instead of relying on what `initdb` picked up.
- Port `127.0.0.1:5432:5432`.
- Named volume `pgdata:/var/lib/postgresql/data`.
- `./docker/postgres/init:/docker-entrypoint-initdb.d:ro`.
- Healthcheck `pg_isready -U lms`.

`01-test-db.sql`: `CREATE DATABASE lms_test;`

`.env.example`:
```
DATABASE_URL=postgresql://lms:lms@localhost:5432/lms
DATABASE_URL_TEST=postgresql://lms:lms@localhost:5432/lms_test
```
Copy to `.env`. Run `npm run db:up`. Expected: `docker compose ps` shows postgres `healthy`.

- [ ] **Step 2: Write the failing env test** in `tests/unit/env.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { parseServerEnv } from '@/server/env';

describe('parseServerEnv', () => {
  it('accepts a postgres URL', () =>
    expect(parseServerEnv({ DATABASE_URL: 'postgresql://a:b@localhost:5432/x', NODE_ENV: 'test' }).DATABASE_URL)
      .toBe('postgresql://a:b@localhost:5432/x'));
  it('fails clearly without DATABASE_URL', () =>
    expect(() => parseServerEnv({ NODE_ENV: 'test' })).toThrow('DATABASE_URL is not set'));
  it('rejects a non-postgres URL', () =>
    expect(() => parseServerEnv({ DATABASE_URL: 'mysql://x', NODE_ENV: 'test' }))
      .toThrow('DATABASE_URL must start with postgresql://'));
  it('defaults NODE_ENV to development', () =>
    expect(parseServerEnv({ DATABASE_URL: 'postgresql://a@h/x' }).NODE_ENV).toBe('development'));
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/server/env`.

- [ ] **Step 4: Implement `src/server/env.ts`** with Zod. The error messages must be exactly the strings in the test. Accept `postgresql://` or `postgres://`. Run `npm test`. Expected: PASS.

- [ ] **Step 5: Prisma init + first model**

```bash
npm i -D prisma@7.10.1 && npm i @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg zod server-only
npx prisma init --datasource-provider postgresql --output ../src/generated/prisma
```
Follow the files Prisma 7.10.1 generates (`prisma.config.ts` holds the datasource URL from `DATABASE_URL`). Add the `Setting` model from Interfaces. Then run `npx prisma migrate dev --name init_settings`. Expected: migration created and applied; client generated in `src/generated/prisma`.

- [ ] **Step 6: Implement `src/server/db.ts`** per Interfaces, with `connectionString` from `serverEnv().DATABASE_URL`.

- [ ] **Step 7: Write the failing integration test** in `tests/integration/db.test.ts`

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { db } from '@/server/db';

describe('database round-trip', () => {
  afterAll(async () => { await db.setting.deleteMany({ where: { key: 'm0.test' } }); await db.$disconnect(); });
  it('upserts and reads a Setting with JSON value', async () => {
    await db.setting.upsert({ where: { key: 'm0.test' }, create: { key: 'm0.test', value: { paymentDay: 10, label: 'සිංහල' } }, update: { value: { paymentDay: 10, label: 'සිංහල' } } });
    const row = await db.setting.findUniqueOrThrow({ where: { key: 'm0.test' } });
    expect(row.value).toEqual({ paymentDay: 10, label: 'සිංහල' });
  });
  it('runs with the database session in a known time zone', async () => {
    const [{ tz }] = await db.$queryRaw<{ tz: string }[]>`SELECT current_setting('TimeZone') AS tz`;
    expect(tz).toBe('Asia/Colombo');
  });
});
```

`vitest.integration.config.mts`:
- `include: ['tests/integration/**/*.test.ts']`
- `globalSetup: ['tests/setup/integration-global.ts']`
- `server-only` aliased to an empty module
- `fileParallelism: false`
- Same `@` alias.

The global setup:
1. Sets `process.env.DATABASE_URL = process.env.DATABASE_URL_TEST`; throws `'DATABASE_URL_TEST is not set'` if missing.
2. Runs `npx prisma migrate deploy` with that env.

- [ ] **Step 8: Run the integration tests**

Run: `npm run test:integration`
Expected: both PASS. If the time zone test reports another zone, the compose `command` from Step 1 is missing. Fix it and run `docker compose up -d postgres`.

- [ ] **Step 9: Verify everything**

Run: `npm test && npm run test:integration && npm run typecheck && npm run lint && npm run build`
Expected: all exit 0.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(db): Postgres 17 compose, Prisma 7 with pg adapter, validated env"
```

---

### Task 5: Health route, production Docker image and CI skeleton

**Files:**
- Create: `src/app/api/health/route.ts`, `tests/integration/health.test.ts`, `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`
- Modify: `next.config.ts` (`output: 'standalone'`), `compose.yaml` (add `app` service under profile `prod`), `package.json` (script `ci`)

**Interfaces:**
- Consumes: `db` from `@/server/db`.
- Produces: `GET /api/health` → `200 {"ok":true,"db":"up"}`, or `503 {"ok":false,"db":"down"}` when the DB query fails. `export const dynamic = 'force-dynamic'`.

- [ ] **Step 1: Write the failing test** in `tests/integration/health.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('reports app and database up', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: 'up' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — cannot resolve `@/app/api/health/route`.

- [ ] **Step 3: Implement the route.** Use `db.$queryRaw\`SELECT 1\`` in try/catch, returning 503 on failure. Run `npm run test:integration`. Expected: PASS.

- [ ] **Step 4: Production image**

`Dockerfile` (multi-stage, `node:22-bookworm-slim`):
1. `deps` stage: `npm ci --ignore-scripts`. The `postinstall` hook (`prisma generate`) would fail here, because the schema isn't copied yet.
2. `build` stage: `ENV DATABASE_URL=postgresql://build:build@localhost:5432/build`, then `npx prisma generate && npm run build`.
   - The URL is a placeholder: `serverEnv()` runs when Next collects page data, but nothing connects.
   - The runner stage gets the real URL from `.env`.
3. `runner` stage:
   - Non-root user `nextjs`.
   - `ENV NODE_ENV=production TZ=Asia/Colombo PORT=3000 HOSTNAME=0.0.0.0`.
   - Copies `.next/standalone`, `.next/static` and `public`.
   - `HEALTHCHECK` curls `/api/health`.
   - `CMD ["node","server.js"]`.

`.dockerignore`: `node_modules`, `.next`, `.git`, `.env*`, `!.env.example`, `docs`, `tests`.

In `compose.yaml`, add service `app`:
- `profiles: [prod]`, `build: .`
- `env_file: .env`, with `DATABASE_URL` overridden to host `postgres`
- `depends_on: postgres (service_healthy)`
- Port `127.0.0.1:3000:3000`

- [ ] **Step 5: Verify the image**

Run:
```bash
docker compose --profile prod up -d --build app
sleep 10 && curl -s localhost:3000/api/health && curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/
docker compose --profile prod down
```
Expected: `{"ok":true,"db":"up"}` and `200`.

- [ ] **Step 6: CI skeleton**

`.github/workflows/ci.yml`:
- Runs on push and pull_request.
- Service `postgres:17-alpine` with the same credentials and `lms_test` DB.
- Steps: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build`.

Add the same sequence locally as `"ci": "npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build"`.
Run: `npm run ci`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ops): health route, standalone Docker image, CI skeleton"
```

---

## Done when (M0 acceptance)

- `npm run ci` exits 0 on `feat/m0-setup`.
- `curl` with `NEXT_LOCALE=si` returns `<html lang="si">` and the Sinhala title.
- `docker compose --profile prod up` serves `/api/health` → `{"ok":true,"db":"up"}`.
- Time helper tests pass under a non-Colombo host zone.
- Branch ready for review and merge to `main` (superpowers:finishing-a-development-branch).
