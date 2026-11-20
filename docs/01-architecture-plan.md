# A/L LMS — Backend & Frontend Architecture Plan

Status: **Revision 2 — for approval** · Date: 2026-11-21

Revision 2 adds four owner decisions and fixes from an independent review:
- Class-wide access until the payment day.
- YouTube used within its embed rules.
- No access while a slip is pending.
- One slip can pay for several classes and months.
- Fixes for race conditions, quiz integrity, upload limits, admin roles, phone changes, time zone, CSP and deployment.

---

## 1. Confirmed decisions

| Area | Decision |
|---|---|
| Scope | One teacher, one subject. Content grouped into **Classes** (e.g. "2026 A/L Theory", "2027 A/L Revision"). |
| Users | Students (**Free** / **Paid**), **Owner** admin, **Staff** admin. |
| Paid model | Monthly fee per class. An approved payment for a month unlocks **all content of that class**: old recordings, tutes, quizzes and live classes. |
| Access window | Paid month **M** gives access from the 1st of M until the class's **payment day** in month M+1. The payment day is set per class (default **10th**). Unpaid by then means the class locks. |
| Pending slips | **No access** until the admin approves. The payment-day window covers the review delay for returning students. |
| Free tier | O/L and A/L term test papers, plus recordings marked as **free preview**. |
| Payment | Bank slip upload, admin approval. One slip can cover several classes and months. Admin can also record manual payments (cash, free card). |
| Video | **YouTube Unlisted, standard player, following YouTube's embed rules**: nothing over the player, native controls. |
| Login | Phone + OTP. One flow for sign-in and sign-up. |
| Sign-up fields | Phone, Name, School, Class type (Online/Physical), A/L exam year (or "O/L / other"), Class(es) to join, NIC (optional), Parent phone (optional). |
| Class type | Profile label + admin filter only. |
| Devices | 1 active device per student. A new login signs the old device out. |
| SMS | Mock provider now. Notify.lk / Text.lk adapter later. |
| Stack | Next.js 16 (App Router) + PostgreSQL + Prisma + Tailwind + shadcn/ui. |
| Hosting | VPS + Docker Compose (app, worker, Postgres, Caddy). |
| Languages | English + Sinhala. |
| v1 extras | Announcements, Tutes, Attendance, MCQ quizzes. |

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16**, React 19, TypeScript strict | Server Components by default. `proxy.ts` (Next 16 middleware) for session gate and cookie renewal. |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | Themed to `#000080`. |
| Database | **PostgreSQL 17** | |
| ORM | **Prisma** + `@prisma/adapter-pg` | Migrations, seed. |
| Validation | **Zod** | Shared client/server schemas. |
| Forms | React Hook Form + Zod resolver | |
| i18n | **next-intl** | Locale in cookie + profile, no URL prefix. |
| Auth | Custom phone-OTP + DB sessions | Pattern from the Lucia session guide. |
| Bot protection | **Cloudflare Turnstile** | On send-OTP **and** resend, and on the parent payment page. |
| Rate limiting | `rate-limiter-flexible`, Postgres store | Its table is declared in `schema.prisma` (`tableCreated: true`), so there is no migration drift. |
| Uploads | Route Handler streaming with `busboy` to disk | Not Server Actions: those have a 1 MB default body limit. |
| Downloads | App authorises, then **Caddy serves the file** (`X-Accel-Redirect` pattern) | Range/resume and ETag for free; no file bytes through Node. |
| Images | `sharp` (server), `browser-image-compression` in a Web Worker (client) | |
| PDF stamping | `sharp` renders stamp text to PNG (Pango shapes Sinhala), `pdf-lib` places the image | Cached per student. |
| Math | KaTeX rendered **on the server** | No client KaTeX bundle. |
| Time | `@date-fns/tz`, everything in **Asia/Colombo** | See §16. |
| Jobs | Worker container (`node-cron` with `timezone`) | Bundled with `tsup` in its own Docker stage. |
| Logging | `pino`, optional Sentry | |
| Tests | Vitest + Playwright (mobile viewports) | |
| Proxy/TLS | **Caddy** | Auto HTTPS, HTTP/3 (`443/udp` published). |

---

## 3. System overview

```
 Student / parent phone                       Admin (phone or laptop)
          │                                            │
          ▼                                            ▼
 ┌─────────────────────────── Caddy (HTTPS) ───────────────────────────┐
 │  sets X-Real-IP · serves private files after app approval           │
 │                                                                      │
 │  Next.js app                                                         │
 │  ├─ Server Components (pages)                                        │
 │  ├─ Server Actions (small forms: profile, approve, quiz answer…)     │
 │  ├─ Route Handlers /api/* (OTP, uploads, file auth, watch, heartbeat)│
 │  └─ proxy.ts: session check + sliding cookie renewal                 │
 │                                                                      │
 │  Worker: quiz auto-submit, notifications, tute stamping,             │
 │          reminders, cleanup, backups                                 │
 └───────────────┬─────────────────────────┬────────────────────────────┘
                 ▼                         ▼
         PostgreSQL (internal only)   /data/uploads volume

 External: YouTube (unlisted embeds) · SMS gateway (later) · Turnstile
```

---

## 4. Access control

### 4.1 Class access (the core rule)

```
hasClassAccess(user, class, now):
  for each Entitlement e of (user, class):
    windowStart = 1st of e.month, 00:00 Asia/Colombo
    windowEnd   = class.paymentDay of (e.month + 1), 00:00 Asia/Colombo
    if windowStart ≤ now < windowEnd → true
  return false
```

**Example** with payment day 10:
- Paid November: access 1 Nov until 10 Dec.
- If December is approved before 10 Dec, access continues until 10 Jan.
- If not, the whole class locks on 10 Dec.

- **"Paid" badge** = `hasClassAccess` is true for at least one class right now.
- **Payable months:** current month and up to 2 months ahead. Months already paid **or pending** are disabled.
- **Archived class:** no new payments; hidden from students.

### 4.2 Per-kind policy (`src/server/access.ts`, deny by default)

| Resource | Rule |
|---|---|
| Paper list | Public |
| Paper file | Logged-in user |
| Recording / online class session — watch | `isFreePreview` → logged-in user. Otherwise `hasClassAccess`. Admin always. |
| Tute file | `isFree` → logged-in user. Otherwise `hasClassAccess`. |
| Quiz — start attempt | Published, `opensAt ≤ now < closesAt`, attempts left, and (`isFree` or `hasClassAccess`). Checked **once at start**. |
| Quiz — answer / submit | Owner of an open attempt before `deadlineAt` + sync grace. No re-check of class access mid-attempt. |
| Quiz image | Quiz published, `now ≥ opensAt`, and user may start or has an attempt. Admin always. |
| Payment slip | Owner or admin. |
| Thumbnail / class cover | Public, served from our domain (never from `i.ytimg.com`). |
| Anything not listed | **Deny.** |

- Locked items are listed with a lock, but **no YouTube ID, file key, correct answer or explanation** reaches the browser.
- Watch endpoint: `GET /api/watch/:kind/:id` with `kind ∈ {recording, session}`.
- IDOR tests exist for every row of this table.

---

## 5. Data model (Prisma, summarised)

Money is integer **LKR**. Months are `"YYYY-MM"` strings, calculated in Asia/Colombo.

### Users & auth
```
User          id, phone (unique, +947XXXXXXXX), name, schoolId?, classType (ONLINE|PHYSICAL)?,
              studentLevel (AL|OL_OTHER), alYear?, nic?, parentPhone?,
              role (STUDENT|STAFF|OWNER), status (ACTIVE|SUSPENDED), locale (en|si),
              passwordHash? (admins), payLinkToken (unique, rotatable), createdAt, lastLoginAt
              idx: (role, status), (alYear), (classType)
PhoneHistory  id, userId, oldPhone, newPhone, changedById, createdAt
School        id, name (unique, normalised), district?, mergedIntoId?
Session       id (= SHA-256 of token), userId, kind (STUDENT|ADMIN), status (ACTIVE|REVOKED),
              revokeReason?, userAgent, ip, createdAt, lastSeenAt, idleExpiresAt, absoluteExpiresAt
              idx: (userId, status)
OtpRequest    id, phone, codeHash (HMAC), attempts, expiresAt, consumedAt?, supersededAt?, ip, createdAt
              idx: (phone, createdAt)
RateLimit     table used by rate-limiter-flexible (declared here)
```

### Classes, enrollment, payments
```
Class         id, title, slug, description, alYear, monthlyFee, paymentDay (1–28, default 10),
              isActive, archivedAt?, sortOrder, coverImageKey?
Enrollment    userId, classId, joinedAt, source (SIGNUP|PAYMENT|ADMIN)     PK (userId, classId)

Payment       id, userId, method (SLIP|MANUAL|PARENT_LINK), amountClaimed, amountExpected,
              slipFileKey?, slipSha256?, bankRef?, paidOn?, idempotencyKey (unique),
              status (PENDING|APPROVED|REJECTED|REVERSED), rejectReason?,
              reviewedById?, reviewedAt?, adminNote?, createdAt
              idx: (status, createdAt), (slipSha256), (bankRef), (userId, createdAt)
PaymentLine   id, paymentId, classId, month, amount,
              status (PENDING|ACTIVE|REJECTED|REVERSED|REFUNDED|TRANSFERRED),
              transferredToLineId?, refundedAmount?
              UNIQUE (paymentId, classId, month)
Entitlement   id, userId, classId, month, paymentLineId, createdAt
              UNIQUE (userId, classId, month)   idx: (classId, month)
```

### Content
```
ClassSession  id, classId, mode (ONLINE|PHYSICAL|HYBRID), title, scheduledAt, durationMin,
              provider (YOUTUBE), videoId?, status (SCHEDULED|LIVE|ENDED|CANCELLED),
              isFree, recordingId?, archivedAt?
              idx: (classId, scheduledAt)
Recording     id, classId, month (for grouping only), title, description,
              provider (YOUTUBE), videoId, thumbnailKey, durationSec, isFreePreview,
              publishedAt, sortOrder, lessonTag?, archivedAt?
              idx: (classId, month, publishedAt)
Tute          id, classId, month, title, fileKey, pageCount, isFree, publishedAt, archivedAt?
StampedTute   tuteId, userId, fileKey, createdAt       PK (tuteId, userId)
Paper         id, level (OL|AL), year, term (T1|T2|T3), source, subject, medium (SI|EN|TA),
              paperFileKey, markingSchemeKey?, downloadCount, publishedAt, archivedAt?
              idx: (level, year, term)
```
`provider` exists so recordings can later move to Bunny Stream or Cloudflare Stream as a data change.

### Quizzes
```
Quiz          id, classId?, title, instructions, durationMin, opensAt, closesAt, isFree,
              shuffleQuestions, shuffleOptions, maxAttempts, showAnswers (AFTER_SUBMIT|AFTER_CLOSE|NEVER),
              showRank, publishedAt, lockedAt? (set on first attempt)
QuizQuestion  id, quizId, order, text, imageKey?, options (5), correctIndex, explanation?
QuizAttempt   id, quizId, userId, attemptNo, questionOrder (int[]), optionOrder (JSON),
              startedAt, deadlineAt, submittedAt?, autoSubmitted, lateSync, score?
              UNIQUE (quizId, userId, attemptNo)   idx: (quizId, userId)
QuizAnswer    attemptId, questionId, choice (ORIGINAL option index), seq, savedAt
              PK (attemptId, questionId)
```

### Engagement & admin
```
Announcement     id, title, body, audience (ALL|FREE|PAID|CLASS|AL_YEAR), audienceRef?,
                 pinned, publishedAt, expiresAt?
Notification     id, userId, title, body, link?, sendAfter, readAt?, cancelledAt?, createdAt
                 idx: (userId, readAt)
Attendance       id, userId, kind (LIVE|RECORDING|PHYSICAL), classSessionId?, recordingId?,
                 firstSeenAt, lastSeenAt, watchedSeconds, lastPositionSec, markedById?
                 UNIQUE (userId, classSessionId), UNIQUE (userId, recordingId)
DownloadLog      id, userId, paperId?, tuteId?, createdAt
AuditLog         id, actorId, action, entity, entityId, before?, after?, ip, createdAt
Setting          key, value (JSON)
```

**Deletes:** content with history is **archived** (`archivedAt`), never hard-deleted. Foreign keys use `onDelete: Restrict`. A recording's `month` is only for grouping, because access is class-wide. Moving it does not change who can watch.

---

## 6. Authentication

### 6.1 Student flow
```
1. Enter phone → normalise to +947XXXXXXXX
2. Turnstile token + rate limits → OtpRequest (6 digits, HMAC, 5 min). Older OTPs for the phone are superseded.
3. SmsProvider.send(). SMS last line: "@<domain> #123456" (enables Android WebOTP autofill).
4. Verify: atomic  UPDATE … SET attempts = attempts + 1 WHERE id = ? AND attempts < 5 RETURNING …
5a. Registered  → create session, revoke other student sessions (NEW_DEVICE) → /dashboard
5b. New phone   → signed signup-ticket cookie (15 min) → /register → user + session
```

- **Session:** random 32-byte token in an `HttpOnly; Secure; SameSite=Lax` cookie. The DB stores only its hash. 30-day sliding expiry, renewed in `proxy.ts`, because Server Components cannot set cookies.
- **Auth checks** run in every page and data function. Layouts are not relied on, since they do not re-run on client navigation.
- **1 device:** revoked sessions fail the next request or the 30-second player heartbeat. The client then destroys the YouTube player and shows the "signed in on another device" screen.
- **Sharing flag:** more than 3 device switches in 7 days marks the account for admin review.
- **Dormant accounts:** after more than 6 months without login, OTP alone is not enough. The student also confirms the last 4 digits of their NIC or parent phone. If neither is on file, admin approval is needed. Reason: Sri Lankan telcos reissue unused numbers.

### 6.2 Rate limits and real IP
- Caddy sets `X-Real-IP {remote_host}`. The app trusts only that header and only from the Caddy container.
- **Per phone:** 5 OTPs/hour, hard limit.
- **Per IP:** CGNAT and class Wi-Fi share IPs, so this limit is soft. Above 30/hour Turnstile switches to an interactive challenge. Hard block only above 150/hour.
- **Daily SMS budget:** split into a registered-number pool and a new-sign-up pool. Admin numbers are exempt. The Owner is alerted at 80%.

### 6.3 Admin
- **Roles:**
  - **OWNER:** everything.
  - **STAFF:** payments queue, content, attendance, announcements. No settings, exports, admin management or reversals.
- **Login:** OTP, then password (argon2). A session is created **only after both** succeed. Password tries are limited to 5 per 15 minutes.
- **Admin session:** 12 hours idle, 7 days absolute.
- **Step-up** (password re-entry within the last 10 minutes) is required for:
  - bank details and WhatsApp number changes
  - reverse and refund
  - CSV export
  - phone number change
  - admin management
- A bank detail change triggers an in-app alert to the Owner, plus SMS once the gateway is live.
- First Owner is created with a one-time CLI command (`npm run create-owner`). There is no password in `.env`.

### 6.4 Phone number change
1. The student asks the admin, who verifies them in person or by NIC / parent phone.
2. The admin enters the new number. An OTP goes to the new number, and the student reads it out or enters it.
3. The number is swapped, all sessions are revoked, and the change is written to `PhoneHistory` and `AuditLog`.

### 6.5 SMS provider interface
```ts
interface SmsProvider { send(to: string, text: string): Promise<{ id: string }> }
// MockSmsProvider: logs OTP; refuses to start in production unless ALLOW_MOCK_SMS=true
// NotifyLkProvider / TextLkProvider: later
```

---

## 7. Payments

### 7.1 Student flow
```
Choose class(es) → choose month(s) per class (current + 2 ahead; paid/pending disabled)
→ bank details + total → upload slip (photo/PDF) + optional bank ref & date
→ Payment PENDING with one PaymentLine per (class, month)
```
- **Idempotency key:** generated client-side per wizard and unique in the DB. Retries on weak data never create duplicates.
- **Slip handling:**
  - Compressed in a Web Worker to max 1600 px.
  - If the phone runs out of memory, the raw image is sent (max 10 MB) and the server resizes it.
  - `sharp` re-encodes the image and strips EXIF/GPS.
  - SVG is rejected.
- **Wizard state** is kept in URL + `sessionStorage`. Low-RAM phones often reload the tab after the camera opens.

### 7.2 Parent payment link
- Each student has a private link `/pay/<token>`, which they share to a parent by WhatsApp.
- The page shows the student's first name and class list. The parent uploads the slip with **no login and no session**, so the student's device is not signed out.
- The page is protected by Turnstile and rate limits. The student or admin can rotate the token.

### 7.3 Admin review
- The queue lists the oldest slips first and shows:
  - slip with zoom and rotate
  - lines per class and month
  - expected vs claimed amount
  - duplicate warnings (same file hash or bank reference)
  - previous payments
- **Approve** runs in one transaction:
  1. `UPDATE payment SET status='APPROVED' … WHERE id = ? AND status = 'PENDING'`. Zero rows means another admin already acted, so the UI shows "already handled".
  2. Insert Entitlements per line.
  3. If a month is already entitled, the admin chooses: skip that line, or **transfer** it to the next unpaid month.
  4. Queue the "approved" notification with `sendAfter = now + 10 s`.
- **Undo** (10 s): restores PENDING, removes the entitlements and cancels the queued notification.
- **Reject:** preset reason; the student can resubmit.
- **Reverse / refund** (Owner, step-up): lines become REVERSED or REFUNDED and entitlements are removed. Audit-logged.
- **Manual payment:** cash or free card, with no slip.

### 7.4 Revenue definitions
- **Cash received:** sum of approved payments by `reviewedAt` month (Colombo).
- **Earned:** sum of ACTIVE lines by line `month`.

---

## 8. Video (YouTube, following embed rules)

YouTube's Required Minimum Functionality (verified 2026-11-21) forbids several things:
- overlays or any visual element in front of any part of the embedded player, including its controls
- obscuring player links
- players smaller than **200 × 200 px**

The plan follows these rules.

**YouTube Studio setup:** visibility **Unlisted**, "Allow embedding" on.

**Watch flow**
1. Before playing, the page shows **our own thumbnail**, uploaded by the admin or fetched once by the worker and served from our domain. Locked users never receive the video ID.
2. On tap, `GET /api/watch/:kind/:id` checks access and returns the video ID.
3. The page embeds `youtube-nocookie.com` with the **standard YouTube controls** (`controls=1, rel=0, playsinline=1`) and tries to start playback. If iOS blocks auto-start, the student taps YouTube's own play button.
4. Size: full-bleed on phones (edge to edge, 16:9) with `min-height: 200px`. Never smaller than 200 × 200.
5. Below the player (not on it): "Registered to Nimal · 077•••4567". This is a deterrent only.
6. The IFrame API reads playback state for a **heartbeat every 30 s**: attendance, resume position, and session check (a 401 destroys the player).
7. Quality, speed and fullscreen use YouTube's native controls. Students on mobile data can choose 144p/240p.

**Live classes**
- Admin schedules a `ClassSession`, pastes the live video ID, and taps **Go live** or **End**.
- After the stream, **Convert to recording** reuses the same video ID.

**Known limit (accepted by owner):** any student with access can tap the YouTube logo, open the video on youtube.com and share the link. Mitigations:
- The ID is only given to entitled users.
- A per-video play count in the admin panel can be compared with YouTube Studio views; a big gap means a leak.
- **Replace video:** the admin uploads a new unlisted copy, makes the leaked one private and updates the ID (audit-logged).
- **Upgrade path:** `provider` allows moving recordings to Bunny Stream or Cloudflare Stream later without a rewrite.

---

## 9. Files

- Stored in `/data/uploads/{papers|tutes|stamped|slips|quiz|thumbs}/` with random keys. No public static path.
- **Uploads:** `POST /api/upload/:kind` streams to disk with `busboy` and enforces limits while streaming: PDF 25 MB, slip 10 MB, image 2 MB. The real type is checked from magic bytes. Upload routes are **excluded from the `proxy.ts` matcher**, because proxy buffers bodies (`proxyClientMaxBodySize`, default 10 MB) and silently truncates anything larger.
- **Downloads:** `GET /api/files/:kind/:id`
  1. `access.ts` check, then a DownloadLog row.
  2. The response header `X-Accel-Redirect: /<path>` is caught by Caddy `handle_response`, which serves the file with Range/resume support.
  3. Headers: `Content-Disposition: attachment; filename*=UTF-8''…` (Sinhala-safe), `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`.
- **Tute stamping:**
  1. First download queues a worker job (concurrency 2), and the page shows "Preparing your PDF…".
  2. The worker renders "Name · Phone · Date" to PNG with `sharp` (Noto Sans Sinhala installed in the image) and places it on each page with `pdf-lib`.
  3. The result is cached in `StampedTute`. Later downloads are instant.
- **Free papers** are stamped once at upload with the site name.

---

## 10. Quizzes

- Format: 5 options and one correct answer. Images supported. Math with KaTeX `$…$`, server-rendered.
- **Builder:** UI, or CSV/Excel import (template provided). Questions **lock** after the first attempt. Edits after that need an explicit **Regrade**, which recalculates scores.
- **Start:** access checked once. `attemptNo` comes from a unique constraint, so parallel starts cannot exceed `maxAttempts`. A per-attempt `questionOrder` and `optionOrder` is stored. `deadlineAt = min(startedAt + duration, closesAt)`.
- **Answers:** each tap saves a `QuizAnswer` row (original option index) with an increasing `seq`. The server keeps only the highest `seq`, so retried or reordered requests cannot overwrite newer answers. Answers are also mirrored in `localStorage`.
- **Network loss:** answers stay queued on the phone and sync on reconnect. After `deadlineAt`, a **90-second sync grace** accepts the final queued answers and flags `lateSync`. The worker then auto-submits.
- **Answer leakage rules** (enforced in the builder):
  - `AFTER_SUBMIT` is allowed only when `maxAttempts = 1`.
  - Otherwise answers show `AFTER_CLOSE`.
  - `correctIndex` and `explanation` are never sent before then.
- **Rank:** first attempt only. Shown as "provisional" while the quiz is open and final at `closesAt`. The leaderboard shows first name + school.
- **Admin analytics:** average score, correct % per question, hardest questions, late-sync list.

---

## 11. Attendance

| Kind | Recorded by |
|---|---|
| Live online | Join + heartbeats. Present if watched ≥ 50% of duration (configurable). |
| Recording | Heartbeats → watched seconds, resume position. |
| Physical | Admin checklist per `ClassSession` (mode PHYSICAL or HYBRID). QR scanning in phase 2. |

Reports per session, student and month, with CSV export.

---

## 12. Announcements & notifications

- Announcement audiences: All / Free / Paid / Class (via Enrollment) / A/L year. Pin and expiry supported.
- In-app notifications:
  - slip approved or rejected
  - new recording
  - live starting in 30 minutes
  - **payment reminder:** 3 days before the class payment day, and on the day
- The worker sends notifications when `sendAfter` passes. SMS copies come with the SMS gateway.

---

## 13. Admin dashboard

| Module | Contents | Role |
|---|---|---|
| Overview | KPIs: students, paid now, pending slips, cash this month. Charts: sign-ups and revenue (6 months). Today's class with Go live. | Both |
| Students | Search and filters. Profile shows details, enrollments, payments, access window, attendance, quizzes and devices (force logout). Suspend, manual grant, sharing flags. | Both. Phone change and export: Owner |
| Payments | Queue, history, manual payment, transfer line, conflicts. Reverse/refund: Owner. | Both |
| Classes | Fee, **payment day**, A/L year, active, archive. | Owner |
| Class sessions | Schedule online/physical/hybrid, video ID, go live/end, convert to recording, physical checklist. | Both |
| Recordings | Add/edit, thumbnail, free preview, order, play counts, replace video. | Both |
| Tutes / Papers | Upload, metadata, bulk upload, marking schemes, download counts. | Both |
| Quizzes | Builder, CSV import, schedule, results, regrade, analytics. | Both |
| Announcements | Create, target, pin, expire. | Both |
| Attendance | Reports, export. | Both (export: Owner) |
| Schools | Merge duplicate school names. | Both |
| Settings | Bank details, WhatsApp number, site text, attendance threshold. | Owner + step-up |
| Admins | Add/remove staff. | Owner + step-up |
| Audit log | All sensitive actions with before/after. | Owner |

### Suggested for later (not in v1)
1. **Web Push** for "live starting soon" when the installed app is closed.
2. **SMS notifications** and **parent monthly reports**.
3. **QR attendance** for physical classes.
4. **Coupons / discounts.**
5. **Q&A per recording.**
6. **A/L exam countdown**, **digital student ID card**.
7. **Leak indicator:** pull YouTube view counts with the Data API and compare them with in-app plays. Check that this works for unlisted videos before building.
8. **Move recordings to Bunny Stream** if leaks hurt revenue (supported by `provider`).

---

## 14. Frontend structure

```
src/
├─ app/
│  ├─ (marketing)/page.tsx          landing
│  ├─ papers/                       ONE route; public layout or student layout by session
│  ├─ login/, register/, pay/[token]/
│  ├─ (student)/                    dashboard, live/[id], recordings/[id], tutes, quizzes/[id],
│  │                                payments, payments/new, notifications, profile
│  ├─ admin/                        modules from §13
│  └─ api/                          auth/otp/*, upload/[kind], files/[kind]/[id],
│                                   watch/[kind]/[id], heartbeat
├─ server/
│  ├─ db.ts · access.ts · time.ts (Asia/Colombo helpers)
│  ├─ auth/        otp.ts, session.ts, guards.ts, stepup.ts
│  ├─ services/    payments, entitlements, content, quiz, attendance, announcements, reports
│  ├─ sms/         provider.ts, mock.ts
│  ├─ storage/     local.ts, s3.ts
│  └─ pdf/stamp.ts
├─ components/  ui/, layout/, player/, quiz/, payments/, papers/
├─ lib/         phone.ts, nic.ts, csv.ts (formula-injection safe), validators/
└─ messages/    en.json, si.json
worker/   index.ts (jobs)
prisma/   schema.prisma, migrations/, seed.ts
tests/    unit/, e2e/
```

Route map: as in the UI/UX plan §3. `/papers` is a single route (two route groups resolving to the same path fail the build).

---

## 15. Security

- **Access:** the per-kind policy in §4.2 is deny-by-default, with an IDOR test per kind.
- **Content-Security-Policy** (nonce based, so pages render dynamically):
  ```
  default-src 'self';
  script-src 'self' 'nonce-{n}' 'strict-dynamic' https://www.youtube.com https://challenges.cloudflare.com;
  frame-src https://www.youtube-nocookie.com https://www.youtube.com https://challenges.cloudflare.com;
  img-src 'self' data: blob:;  connect-src 'self';  style-src 'self' 'unsafe-inline';
  font-src 'self';  object-src 'none';  base-uri 'self';  frame-ancestors 'none';  form-action 'self'
  ```
- **File responses:** `nosniff`, `CSP: sandbox`, `attachment`.
- **CSV exports:** cells starting with `= + - @ \t \r` are prefixed with `'`.
- **OTP abuse:** Turnstile, limits, SMS budget pools (§6.2).
- **Admin:** roles, step-up, short sessions, Owner alerts, audit log with before/after.
- **Network:** Postgres reachable only on the internal Docker network. Secrets in `.env`, never committed.
- **Backups:** nightly `pg_dump` + uploads, encrypted, off-site via rclone. A restore drill runs monthly.

---

## 16. Time zone rules

- Containers run with `TZ=Asia/Colombo`. Code still passes `timeZone: 'Asia/Colombo'` explicitly everywhere: `Intl`, `@date-fns/tz` and the node-cron `timezone` option.
- Report SQL uses `AT TIME ZONE 'Asia/Colombo'` for month buckets.
- Admin date/time inputs are parsed as Colombo time.
- Countdowns are computed from a server-sent UTC timestamp, which avoids hydration mismatch.

---

## 17. Deployment

```
docker-compose.yml
  caddy    80/tcp, 443/tcp, 443/udp · TLS · X-Real-IP · handle_response file serving (uploads volume read-only)
  app      Next.js standalone build
  worker   separate build stage (tsup bundle) + postgresql-client-17 + Noto Sans Sinhala font
  postgres internal network only, volume pgdata
volumes: pgdata, uploads, caddy_data
```
- **No public cron routes.** The worker calls services directly.
- **Needs:** a domain, a VPS (2 vCPU / 4 GB), Ubuntu LTS and Docker.
- **CI:** lint, type-check, unit + e2e tests, build images, deploy over SSH, `prisma migrate deploy`.

---

## 18. Build milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Setup | Next.js, theme, Prisma, Compose, i18n, CI skeleton, TZ helpers with tests. |
| M1 | Auth | OTP (mock + WebOTP format), register, 1-device, rate limits, Turnstile, admin OTP + password, roles, step-up. |
| M2 | Content core | Classes, enrollment, papers, recordings, YouTube player (**tested on a real iPhone and a low-end Android**), access policy + IDOR tests. |
| M3 | Payments | Wizard, parent link, uploads, review queue, transactions, undo, transfer, reverse, revenue. |
| M4 | Sessions + attendance | Online/physical sessions, go live, convert, heartbeats, reports. |
| M5 | Tutes + announcements | Stamping worker, notifications, reminders. |
| M6 | Quizzes | Builder, import, attempt engine, sync grace, results, rank, regrade. |
| M7 | Admin overview | KPIs, charts, exports, audit, settings, schools merge. |
| M8 | Launch | E2E on mobile viewports, Lighthouse ≥ 90, security review, backups + restore drill, VPS deploy. |

---

## 19. Defaults (change any before build)

| Item | Default |
|---|---|
| Payment day | 10th, per class |
| Pay ahead | Up to 2 future months |
| Paper download | Login required |
| Leaderboard | First name + school, first attempt only |
| Live attendance | ≥ 50% watched |
| Quiz sync grace | 90 seconds |
| Admin session | 12 h idle / 7 days max |
| Dormant re-check | After 6 months without login |
| Dark mode, PWA | Included |
