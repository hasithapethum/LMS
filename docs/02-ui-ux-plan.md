# A/L LMS — UI/UX Plan (mobile-first)

Status: **Revision 2 — for approval** · Date: 2026-11-21 · Brand colour: **#000080 (navy)**

Revision 2 adds class-wide access, a player that follows YouTube's rules, a parent payment page, a single OTP input, a class step at sign-up, system Sinhala fonts and safe PWA caching.

---

## 1. Who we design for

| User | Device & context | Needs most |
|---|---|---|
| A/L student (16–19) | Mid/low-end Android, 360–412 px, mobile data, often at night | Join today's live class fast, watch recordings, download papers, pay without visiting class |
| Parent | Own phone, may read Sinhala only | Pay without logging in as the student; clear amount and bank details |
| Owner / staff admin | Phone between classes, laptop at home | Approve slips in seconds, run live classes, see who paid |

**Principles**
1. **Mobile first.** Design at 360 px. Every student task works on a phone.
2. **One primary action per screen.** Full-width navy button in the thumb zone.
3. **Show what's locked.** Locked content is visible, with a clear "Pay for December" path.
4. **Save data.** No YouTube code until the student taps play. Compressed images. Skeletons, not spinners.
5. **Sinhala is first-class.** Every label is translated. Layouts allow longer Sinhala words.
6. **Trust around money.** Access dates and payment status are always visible.

---

## 2. Design tokens

### 2.1 Colour (brand scale from #000080)

| Token | Hex | Use |
|---|---|---|
| `navy-50` | `#EEF0FF` | Selected chip, info banner |
| `navy-100` | `#DDE1FF` | Hover, progress track |
| `navy-200` | `#BCC3FF` | Borders on brand surfaces |
| `navy-300` | `#949EF5` | Links/icons in dark mode |
| `navy-400` | `#6670E0` | Focus ring |
| `navy-500` | `#3B43C2` | Primary button in dark mode |
| `navy-600` | `#1E24A6` | Primary hover (light) |
| `navy-700` | `#0D1093` | Primary pressed (light) |
| **`navy-800`** | **`#000080`** | **Brand, primary button, app bar, links (light)** |
| `navy-900` | `#000066` | Headings on tinted surfaces |
| `navy-950` | `#00003D` | Dark-mode app bar |

| Supporting | Hex | Use |
|---|---|---|
| `gold-400` | `#F5B301` | **Paid** badge, sparingly |
| `success-600` | `#15803D` | Approved, present, correct |
| `warning-600` | `#B45309` | Pending, payment due soon |
| `danger-600` | `#B91C1C` | Rejected, locked expired, destructive |
| `live-500` | `#E11D48` | "LIVE" pill (outside the player) |
| Neutrals | Slate | Text `slate-900`, secondary `slate-600`, border `slate-200`, page `#F7F8FC` |

Contrast: white on `#000080` ≈ 16:1. White on `#3B43C2` ≈ 7.6:1. Both pass AA and AAA.

**Dark mode** follows the phone setting, with a toggle in Profile. Page `#0B0B1F`, surface `#14142E`, primary button `navy-500`, links `navy-300`, text `slate-100`.

### 2.2 Typography

| Script | Font | Download? |
|---|---|---|
| Latin | **Inter** (variable, Latin subset) via `next/font` | ~30 KB, once |
| Sinhala | **System font stack**: `"Noto Sans Sinhala", "Sinhala Sangam MN", "Nirmala UI", "Iskoola Pota", sans-serif` | **None.** Android, iOS and Windows already include these. |

| Style | Size / line-height | Weight |
|---|---|---|
| Display | 30 / 38 | 700 |
| H1 | 24 / 32 | 700 |
| H2 | 20 / 28 | 600 |
| H3 | 18 / 26 | 600 |
| Body | 16 / 26 (Sinhala 16 / 28) | 400 |
| Small | 14 / 22 | 400 |
| Caption | 12 / 16 | 600 |

Inputs are never below 16 px, so iOS does not zoom on focus.

### 2.3 Spacing, shape, motion
- 4 px grid. Side padding 16 px on mobile, 24 px on tablet. Max content width 1200 px.
- Radius: inputs/buttons 10 px, cards 14 px, bottom sheets 20 px.
- Touch targets ≥ 44 × 44 px with 8 px gaps.
- Motion: 150–250 ms ease-out. `prefers-reduced-motion` turns animations off.

---

## 3. Navigation & route map

### Student, mobile (< 768 px)
```
┌──────────────────────────────┐
│ ▣ Logo        EN|සිං  🔔3    │  app bar 56 px, navy
├──────────────────────────────┤
│         page content         │
├──────────────────────────────┤
│ 🏠    🔴     ▶     📄    ☰   │  bottom nav 64 px + safe-area
│ Home  Live  Videos Papers More│
└──────────────────────────────┘
```
"More" opens a sheet: Tutes, Quizzes, Payments, Notifications, Profile, Help (WhatsApp), Logout.

**Desktop:** 240 px left sidebar with the same items. **Admin:** sidebar on desktop, drawer on mobile. Payments queue, class session controls and Overview are fully optimised for phones.

| Route | Who | Purpose |
|---|---|---|
| `/` | Public | Landing: teacher, classes + fees, free papers, results |
| `/papers` | Public list, login to download | One route; layout depends on login |
| `/login`, `/register` | Public | Phone → OTP → profile (new users) |
| `/pay/[token]` | Parent (no login) | Upload a slip for one student |
| `/dashboard` | Student | Access status, next class, announcements, continue watching |
| `/live`, `/live/[id]` | Student | Upcoming + live class |
| `/recordings`, `/recordings/[id]` | Student | Grouped by month, player |
| `/tutes`, `/quizzes`, `/quizzes/[id]` | Student | PDFs, quizzes |
| `/payments`, `/payments/new` | Student | History, payment wizard, share parent link |
| `/notifications`, `/profile` | Student | Inbox, profile, language |
| `/admin/*` | Owner / Staff | See architecture plan §13 |

---

## 4. Key screens

### 4.1 Login
```
┌──────────────────────────────┐
│          [ Logo ]            │
│   Welcome to <Teacher> A/L   │
│  Mobile number               │
│  ┌────┬─────────────────────┐│
│  │+94 │ 7X XXX XXXX         ││  inputmode="tel" autocomplete="tel"
│  └────┴─────────────────────┘│
│  [ Turnstile – usually invisible ]
│  ┌──────────────────────────┐│
│  │       Send code  ►       ││
│  └──────────────────────────┘│
│  New here? The same button   │
│  creates your account.       │
└──────────────────────────────┘
```
- Accepts `07…`, `7…` or `+947…`. Errors appear under the field.
- If Turnstile asks for an interactive check (busy shared Wi-Fi), the text says: "Many people are signing in from this network. Please tick the box."

### 4.2 Enter code
```
  Enter the 6-digit code sent to
  +94 77 123 4567   [Change number]

  ┌──┬──┬──┬──┬──┬──┐
  │ 4│ 8│ 1│  │  │  │      ONE input styled as 6 boxes
  └──┴──┴──┴──┴──┴──┘      autocomplete="one-time-code" inputmode="numeric"

  Resend code in 0:45
```
- **Android:** the WebOTP API reads the SMS and fills the code automatically. **iOS:** keyboard suggestion via `one-time-code`. Paste works on both.
- Auto-submits at 6 digits. A wrong code shows "2 tries left". The shake animation is off under reduced motion.
- **Resend** runs a fresh Turnstile check.

### 4.3 Complete profile (new users)
Three short steps with a progress bar:
1. **About you:** Name; School (type-ahead from the school list, "Add my school" if missing); A/L exam year chips (2026 · 2027 · 2028 · Other year · **O/L / other**).
2. **Class details:** Online / Physical as two large cards; NIC (optional); Parent phone (optional).
3. **Join classes:** cards of active classes, pre-selected by exam year, multi-select. O/L students can skip this step.

**Start learning** goes to the dashboard.

### 4.4 Student dashboard
```
┌──────────────────────────────┐
│ Hi Nimal                     │
│ ┌──────────────────────────┐ │
│ │ 2026 A/L Theory   ★ PAID │ │  per enrolled class
│ │ Access until 10 Dec      │ │
│ │ ▸ Pay December to keep   │ │  shown from the 25th
│ │   access   [Pay now]     │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 🔴 LIVE in 02:14:30      │ │  → "Join now" when live
│ │ Organic Chemistry – P3   │ │
│ └──────────────────────────┘ │
│ 📌 Announcements (2)         │
│ ▶ Continue watching          │
│ Quick: Papers · Tutes · Quiz │
└──────────────────────────────┘
```
Class card states:

| State | Card shows |
|---|---|
| Paid | ★ PAID (gold), "Access until 10 Dec" |
| Due soon (within 3 days of the payment day) | Amber "Pay December before 10 Dec" + Pay now |
| Pending | Amber "Slip under review — access opens when approved" |
| Locked / free | "Unlock all recordings, tutes and live classes" + Pay Rs 2,500 |
| Rejected | Red "Slip rejected: unclear image" + Upload again |

### 4.5 Recordings
- Class selector (if more than one class), then month chips (Dec · Nov · Oct …) for browsing.
- Cards show our thumbnail (served from our domain), title, duration and a watched bar.
- **Class locked:** all cards show a lock. Tapping one opens a sheet: "Pay Rs 2,500 for December to unlock **all 48 recordings**, tutes and live classes of 2026 A/L Theory." Then **Pay now**.
- **Free preview:** "FREE" badge, playable when logged in.

### 4.6 Video player (follows YouTube's rules)
```
┌──────────────────────────────┐
│ 🔴 LIVE  · 312 watching      │  status ABOVE the player (live only)
│┌────────────────────────────┐│
││                            ││  full-bleed 16:9, min-height 200 px
││   YouTube player, native   ││  NOTHING drawn over the player
││   controls (quality, speed,││
││   fullscreen)              ││
│└────────────────────────────┘│
│ Registered to Nimal · 077•••4567  small, below the player
│ Lesson 12 – Alkenes          │
│ November · 54 min            │
│ ‹ Previous      Next lesson ›│
└──────────────────────────────┘
```
- Before the tap, our thumbnail and play button sit in the player's place. The YouTube player has not loaded yet, so this is not an overlay.
- After the tap, the YouTube player loads and tries to start. On iOS the student may need to tap YouTube's play button once.
- **Resume:** "Continue from 12:40?" chip **below** the player.
- **Signed out on another device:** the player is removed, then a full-screen notice appears.
- **Tip under the player** for slow connections: "Slow connection? Tap ⚙ → Quality → 240p".

### 4.7 Papers
- Tabs **A/L | O/L**. The Filter button opens a sheet with Year, Term, Source and Medium.
- Rows read, for example, "2025 · 3rd Term · Royal College · Sinhala medium", with a **Download** button and a "Marking scheme" link when one exists.
- Download supports resume. Logged-out users go to login, then return to the same paper.

### 4.8 Payment wizard (`/payments/new`)
Sticky **Continue** at the bottom. Steps are saved in the URL, so a reload after the camera opens keeps progress.
1. **Classes:** multi-select cards with the monthly fee.
2. **Months** per class: chips for the current month and 2 ahead. Paid months show "Paid"; pending months show "Pending" and are disabled. Live total: "2026 A/L Theory: Dec, Jan · Rs 5,000".
3. **Bank details:** bank, branch, account name and number, each with **Copy**. Hint: "Use your phone number as the reference."
4. **Slip:** **Take photo** / **Choose file**, preview, retake. Optional bank reference and paid date. The image is compressed on the phone before upload.

After submit, `/payments` shows a timeline:
```
 ● Submitted       21 Nov 10:42
 ● Under review    usually within 24 hours
 ○ Approved        access opens immediately
```

**Ask a parent to pay:** a button on `/payments` opens the WhatsApp share sheet with the private `/pay/<token>` link. A "Reset link" option is available.

### 4.9 Parent payment page (`/pay/[token]`)
- No login. The header reads "Paying for **Nimal** (2026 A/L)", first name only.
- The same steps 1–4 as the wizard. Sinhala is the default if the student's locale is Sinhala.
- The confirmation says: "Slip received. Nimal will see the update in the app."

### 4.10 Quiz attempt
```
┌──────────────────────────────┐
│ Q 7 / 50        ⏱ 38:12  ☰  │  sticky; red under 5 min
├──────────────────────────────┤
│ Which of the following …     │
│ [diagram, tap to zoom]       │
│ ┌──────────────────────────┐ │
│ │ (1) …                    │ │  option cards; selected =
│ │ (2) …                    │ │  navy border + navy-50 fill
│ │ (3) … (4) … (5) …        │ │
│ └──────────────────────────┘ │
│ ⚑ Flag          ✓ Saved      │  "Offline — 3 answers waiting" when offline
│ ‹ Prev                Next › │
└──────────────────────────────┘
```
- ☰ opens a palette showing each question as answered, unanswered or flagged.
- The submit dialog shows the unanswered count.
- **Time's up while offline:** "Time's up. We'll send your saved answers when you're back online (within 90 s)."
- **Result:** score ring, time taken, and the rank labelled **provisional** until the quiz closes. Answer review follows quiz settings.

### 4.11 Admin: slip review
**Desktop:** a split view. Left: the slip with zoom and rotate. Right: student, lines (class × month), expected vs claimed amount, duplicate warning, history. Keyboard: **A** approve, **R** reject, **J/K** next/previous.

**Mobile:**
```
┌──────────────────────────────┐
│ Pending slips (14)      ⟳    │
│ [ slip image – pinch zoom ]  │
│ Nimal Perera · 077 123 4567  │
│ Theory: Dec, Jan · Revision: Dec
│ Expected Rs 7,000 · Claimed 7,000 ✓
│ ⚠ Same slip used on 12 Oct   │
│ ┌────────────┐┌────────────┐ │
│ │  ✕ Reject  ││ ✓ Approve  │ │  56 px, thumb zone
│ └────────────┘└────────────┘ │
└──────────────────────────────┘
```
- Reject offers preset reasons.
- After each action the next slip loads, with a 10-second **Undo**. The student is notified only after the undo window.
- "Already handled by Kamal" appears if another admin acted first.

### 4.12 Admin: overview
- KPI tiles (2 × 2 on mobile): Students, Paid now, Pending slips (tap to open the queue), Cash this month.
- Then: today's class card with **Go live**, 6-month charts of sign-ups and revenue, recent activity.

---

## 5. States (every list and page)

| State | Pattern |
|---|---|
| Loading | Skeletons shaped like the final layout |
| Empty | One friendly line + one action ("No recordings yet. Next live class Sat 5 PM.") |
| Locked | Lock icon + reason + **Pay** action |
| Pending | Amber chip, expected time |
| Error | Plain message + **Try again**; form errors under each field |
| Offline | Thin banner; quiz shows queued answers |
| Signed out elsewhere | Full-screen notice + **Sign in again** |
| Success | Toast for small actions; full page for payment and quiz submit |

---

## 6. Language (EN / සිං)

- Toggle in the app bar and in Profile, saved to the account. `<html lang>` switches between `en` and `si`.
- All UI strings live in `messages/en.json` and `messages/si.json`. Admin content is shown as typed.
- Sinhala text is often 30–50% wider. Buttons have no fixed widths and wrap to 2 lines at most.
- Dates use `Intl.DateTimeFormat(locale, { timeZone: 'Asia/Colombo' })`. Money uses Western digits: "රු. 2,500".

---

## 7. Accessibility

- WCAG 2.2 AA: contrast, a 2 px `navy-400` focus ring, labelled inputs, errors linked with `aria-describedby`.
- Status is never shown by colour alone; Paid, Pending and Locked always pair an icon with text.
- Keyboard access everywhere, focus trapped in sheets and dialogs, and focus restored on close.
- Reduced motion respected. No autoplay until the user taps.

---

## 8. Mobile performance budget

| Metric | Target (mid-range Android, 4G) |
|---|---|
| LCP | < 2.5 s |
| INP | < 200 ms |
| JS on student pages | < 150 KB gzip (excludes the YouTube player, which loads on tap) |
| Lighthouse mobile | Performance ≥ 90, Accessibility ≥ 95 |

How: Server Components, a YouTube facade, our own thumbnails (`next/image`, AVIF/WebP), no Sinhala web font, server-rendered KaTeX, image compression in a Web Worker, resumable downloads.

---

## 9. PWA

- Manifest: name, theme colour `#000080`, icons, `display: standalone`. Android offers "Add to Home screen".
- **Service worker caches only** static assets (`/_next/static`, icons, fonts) and an offline page.
- **Never cached:** page navigations, RSC payloads, `/api/*`, files.
- All caches are cleared on logout and on "signed out elsewhere", so a shared phone never shows the previous student's data.

---

## 10. Design deliverables before UI code

1. Tailwind + shadcn tokens from §2 (light + dark).
2. A component sheet:
   - buttons, inputs, the OTP field, chips
   - class status card (5 states), locked card
   - badges, bottom nav, bottom sheet, stepper, timeline
   - KPI tile, data table
3. A clickable mobile mock of the main flow: Login → Code → Profile (3 steps) → Dashboard → Recordings (locked) → Payment wizard → Parent page → Admin slip review.
