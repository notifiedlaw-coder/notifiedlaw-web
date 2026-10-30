# Implementations

Running log of every commit and what it changed. Oldest first. Untracked on purpose.

---

## 6012925 — Initial commit from Create Next App
- Scaffolded Next.js app (App Router, TypeScript, ESLint, Tailwind-style `globals.css`) with `AGENTS.md` and README.
- Cloudflare deploy wiring: `open-next.config.ts` and `wrangler.jsonc`; `next.config.ts` added.
- Route-group `(app)` with stub pages: ai, case-law, checkout, exam-prep, files, flashcards, home, leaderboard, legislation, library (`[course]`, `[course]/[topic]`), plans, search, settings; plus `/onboarding` and `/welcome`.
- `home` page built out (189 lines); library index and course pages with real content.
- Shared pieces: `app-shell.tsx` (nav shell), `icons.tsx`, `screen-stub.tsx`, `lib/data.ts` (sample data), `lib/nav.ts` (nav items).

## cc52cb5 — Add landing page at / and Unsplash imagery; build out app screens
- New marketing landing page (`landing.tsx`) served at `/`, with hero, case-law, exam, flashcards, library and podcast-art Unsplash images in `public/landing/`.
- Replaced every stub screen with a real client component: Notified AI chat, case-law list and case brief, checkout, exam prep, files, flashcards (flip cards), Hot Topics podcast, leaderboard, legislation list and statute view, library with topic reader, plans, search, settings, onboarding.
- Added Articles section (`/articles`, `/articles/[slug]`).
- Added `lib/content.ts` (300 lines of notes, cases, statutes, articles content).
- Added shared UI kit (`ui.tsx`), plan context (`plan.tsx`) and light/dark theme provider (`theme.tsx`).
- Removed `screen-stub.tsx`; updated dependencies and `next.config.ts`.

## 2770cd1 — Add /login and /signup, sign out to landing, personal info signup step
- Added `/login` and `/signup` routes.
- Moved the old `/welcome` page into a reusable `components/auth-form.tsx`.
- Onboarding gained a personal-info step.
- Settings sign-out now returns to the landing page; landing nav links to login/signup.

## 3e8f413 — Route notifiedlaw.com custom domain to the Worker
- `wrangler.jsonc`: attached the `notifiedlaw.com` custom domain route to the Cloudflare Worker.

## 6e146c1 — Redirect www.notifiedlaw.com to the apex domain
- `next.config.ts`: added a host-based redirect from `www` to apex.
- `wrangler.jsonc`: added the `www` route so the Worker receives and redirects it.

## 09d2315 — Add SEO metadata, JSON-LD, sitemap, robots and llms.txt
- Rich root metadata in `layout.tsx` (title template, description, Open Graph, Twitter, canonical).
- `lib/site.ts` holds site constants; `json-ld.tsx` renders structured data.
- JSON-LD on landing and article pages; per-page metadata for case-law, legislation and articles.
- Generated `sitemap.ts`, `robots.ts` and an `llms.txt` route for AI crawlers.
- `next.config.ts` headers tweak for the new routes.

## f67931c — Add smooth scroll, copy deterrents and per-user watermark on notes
- Smooth scrolling in `globals.css`.
- `copy-guard.tsx`: blocks selection/copy/context actions on study content, mounted in the root layout and the reader, case brief and statute views.
- `watermark.tsx`: per-user watermark overlay on notes, cases and statutes (removed in the next commit).

## 6903432 — Remove per-user watermark from notes, cases and statutes
- Deleted `watermark.tsx` and its usage in reader, case brief and statute views. Copy deterrents remain.

## 309d7fe — Landing: more features, Hot Topics podcast, expert marking, mobile swipe rails
- Expanded feature list on the landing page, including the Hot Topics podcast and expert marking.
- Feature sections become horizontal swipe rails on mobile.
- Synced copy in `site.ts`, `layout.tsx` metadata and `llms.txt`.

## 7cc51f9 — Landing: hamburger menu for the mobile navbar
- Added a hamburger toggle and dropdown menu for the landing navbar on small screens.

## 6c97835 — Landing: uniform highlight cards, shorter mobile cards, remove hero eyebrow
- Highlight cards share one size and style; shorter on mobile.
- Dropped the hero eyebrow line; net 36 lines removed from `landing.tsx`.

## dce2446 — Landing: autoplaying hero video from R2 with play/pause and mute controls
- Hero plays a looping video streamed from Cloudflare R2.
- New `/media/[...key]` route handler reads R2 objects (with range support).
- Play/pause and mute controls; `hero-poster.jpg` poster frame.
- `wrangler.jsonc` R2 bucket binding; generated `cloudflare-env.d.ts` types; `next.config.ts` and CSS updates.

## 1f4c830 — Landing: replace hero video with live animated product walkthrough and voice-over
- Removed the video element from the hero.
- New `components/hero-promo/` (`index.tsx` controller, `scenes.tsx` with ~345 lines of animated scenes) rendering the product UI live, synced to a voice-over track.
- Media route adjusted to serve the audio.

## 34e23c4 — Landing: student trial notice redesign, 'flip on the go' copy
- Redesigned the student trial notice block.
- Flashcard feature copy now reads "flip on the go".

## 113a149 — Mobile app UX: hamburger drawer nav, redesigned Home, level dropdown, no sideways overflow
- Bottom tab bar replaced by a top bar plus slide-in drawer on phones.
- Home rebuilt around one focus: continue reading, Today list, swipeable courses.
- Level picker becomes a dropdown on phones.
- Chip rows scroll instead of wrapping; plan chip stays on one line.
- Fixed horizontal overflow on library course, leaderboard and case brief; removed leftover bottom-bar offsets.
- Touched `ui.tsx`, `nav.ts` (dropped bottom-bar items), `globals.css`.

## 9764b24 — Desktop sidebar: larger nav text, scaled for 13-27in and ultrawide
- Rewrote sidebar sizing in `app-shell.tsx` so nav text, icons and widths scale across 13" to 27" and ultrawide displays.

## f5327da — Desktop-scaled toolbar and content, NL favicon, Pre-Bar and Bar Course gated to Max
- Toolbar and content areas scale on desktop (home, library, reader, plans, course topics).
- Replaced `favicon.ico` with an NL `icon.svg`.
- Pre-Bar and Bar Course are locked to the Max plan (`lib/data.ts`, library views, plans).

## f62b120 — Notified AI: pin input to bottom on desktop by filling parent height
- `ai-chat.tsx` fills its parent height so the input bar stays at the bottom on desktop.

## be877d6 — Shimmer effect on the Max plan label in the toolbar
- Added a shimmer animation class in `globals.css` and applied it to the Max label in `app-shell.tsx`.

## df34bfd — Max shimmer: clip to glyphs only, visible highlight in both themes
- Shimmer is clipped to the text glyphs only, with a highlight colour visible in light and dark themes.

## 74d45a2 — Toolbar plan label: short Free/Pro/Max until desktop width
- Toolbar shows short labels (Free/Pro/Max) and switches to full names at desktop width.

## bc4b4a2 — Fix shimmer class overriding hidden utilities on the plan label
- Removed a `display` rule from the shimmer class that overrode `hidden` utilities.

## 96b5a84 — Plan label: hide/show on wrapper so shimmer display can't override it
- Moved the responsive hide/show classes onto a wrapper element so the shimmer's own `display` cannot interfere.

## eb2617a — Smoother Max shimmer: seamless loop, eased sweep, neutral highlight
- Seamless animation loop, eased sweep timing and a neutral highlight colour.

## cf6ac73 — UI/UX bug fixes and performance pass
- Security/robustness: plan from URL and storage is validated, so a crafted `/checkout?plan=` link can no longer persist an unknown plan and crash the app shell.
- Plan context memoised; added missing `ink-dark` token used behind photo heroes.
- Dark mode: fixed hardcoded light greys (eyebrows, chevrons, gear, reader chapter chips, flashcard grade hover).
- Full-height pages use `h-full` so they fit at zoomed desktop widths.
- Reader podcast bar re-renders alone instead of the whole note.
- Hot Topics replays from the end; flashcard key shortcuts ignore form controls.
- AI chat scrolls to new replies, Enter is IME-safe, inputs labelled, `aria-pressed` added.
- Drawer: focus management and no double navigation.
- Media route: correct suffix byte ranges.
- Hero voice-over not fetched while muted.
- Landing images resized (~7 MB to ~1.7 MB); hero photos self-hosted in `public/photos/` with `CREDITS.txt`.
- Security headers: frame, nosniff and referrer policy in `next.config.ts`.

## e30f383 — Landing: loading screen that waits for images, fonts and voice-over
- New `LandingLoader` overlay: wordmark plus progress bar, shown until all landing images, fonts and the voice-over have downloaded.
- Minimum 900 ms so fast loads don't flash; 12 s cap so a stalled network still shows the page; 500 ms fade out.
- Voice-over fetched whole and passed to the hero as a blob URL, so unmuting is instant.
- Hero walkthrough holds on its first frame until the loader lifts.
- Hidden via `<noscript>` when JavaScript is off.

## ef5b312 — Home: move quote of the day under the Akwaaba greeting
- Quote moved from the page footer into the header, directly below "Akwaaba, name".
- Restyled iOS-like: left-aligned, thin amber accent bar, 17 px medium quote, muted attribution; removed the "Quote of the day" eyebrow and centred layout.

## 6a8872d — Hero promo: make voice-over the clock so audio stops breaking
- Cause: visuals ran on a rAF clock with dt capped at 0.1 s; any dropped frame made it fall behind real time, and the sync effect then seeked the audio on every 0.3 s drift, causing constant breaks.
- While the voice-over is audibly playing it now drives the visuals (`setTime(audio.currentTime)`); the dt clock is used only when muted, paused or stalled.
- Audio is seeked only when starting or on a jump over 1.5 s (loop wrap, resume), not for small drift.

## 16f6ddb — Add Terms of Service and Privacy Policy pages
- New routes `/terms-of-service` and `/privacy` (needed for the Google OAuth consent screen), built on a shared `LegalPage` component (`src/components/legal-page.tsx`).
- Placeholder legal copy: Ghana governing law, Data Protection Act 2012 (Act 843), Sign in with Google data use, Notified AI, payments, rights, contact `support@notifiedlaw.com` (placeholder address).
- Landing footer links Privacy, Terms and Support; auth form text links to both; both added to the sitemap.

## 6f558d0 — Use notifiedlaw@gmail.com as the contact email
- Replaced the placeholder `support@notifiedlaw.com` with `notifiedlaw@gmail.com` in the legal pages (`CONTACT_EMAIL`) and the landing footer Support link.

## 043f9f2 — Landing loader: skip for crawlers and automated reviewers
- Google OAuth verification reported the home page as behind a login; the full-screen loader overlay hid the content from its reviewer.
- `LandingLoader` now returns nothing and calls `onReady(null)` straight away when `navigator.webdriver` is set or the user agent matches bot/crawl/spider/google/headless/lighthouse.

## 567735c — Move app home to /dashboard; serve the landing page at /home
- Signed-in Home screen moved from `/home` to `/dashboard` (`(app)/dashboard`); sidebar label stays "Home".
- Updated every link to it: sidebar and active state, nav titles, login redirect, onboarding finish, checkout done, `PRIVATE_PATHS` (so robots disallows `/dashboard`, not `/home`).
- New public `/home` re-exports the landing page (canonical stays `/`), so Google's reviewer can open either URL without signing in.

## 35e21f3 — Google sign-in with Better Auth on Cloudflare D1
- D1 database `notifiedlaw-db` (WEUR) bound as `DB`; Drizzle schema in `src/db/schema.ts` (user, session, account, verification); migration `migrations/0000_keen_blue_marvel.sql` applied locally and remotely.
- `src/lib/auth.ts`: Better Auth built per request from the Cloudflare env (Drizzle D1 adapter, Google provider); `getSession()` helper. Route handler at `/api/auth/[...all]`; client in `src/lib/auth-client.ts`.
- Config: `GOOGLE_CLIENT_ID` and `BETTER_AUTH_URL` as vars in `wrangler.jsonc`; `GOOGLE_CLIENT_SECRET` and `BETTER_AUTH_SECRET` as secrets (`.dev.vars` locally; `.dev.vars.example` lists the keys).
- `(app)` layout redirects to `/login` without a session; `/login` and `/signup` redirect to `/dashboard` when signed in. New users go to `/onboarding`.
- Sidebar, settings and dashboard greeting show the real Google name/email; Sign Out calls `authClient.signOut`.
- Sign-in form: removed Apple button, divider, student email field and Continue button; Google button starts the OAuth flow.

## 1cf9215 — Gate only private pages; keep SEO pages public
- Build failed because the session check made every `(app)` page dynamic and gated the public library, articles, case law and legislation pages.
- Moved dashboard, settings, files, ai, checkout, flashcards, exam-prep, leaderboard, search, hot-topics and plans into `(app)/(private)`, whose layout redirects to `/login` without a session. Onboarding checks the session in its page.
- `(app)` layout stays static; `SessionUser` reads the session in the browser (guest fallback) for the sidebar.
- Deployed (version 1f5fd294). Signed-out redirect is streamed (meta refresh + client redirect), not a hard 307, because the shell is flushed first; user-specific data pages must check the session themselves.

## 54e7a97 — Auth pages: add links back to the landing page
- `/login` and `/signup`: "← Back to home" top-right on desktop, "← Home" top-left over the photo on mobile; the NotifiedLaw wordmark now links to `/`.

## 103ce75 — Store onboarding answers and plan in D1
- New tables `profile` (name, DOB, gender, phone, university, level, goals) and `subscription` (plan, credits used/extra); migration `0001_tidy_shadow_king.sql` applied locally only so far (remote applies at deploy).
- API: `GET /api/me`, `PUT|PATCH /api/profile` (server-side validation: age 16+, known university/level/gender, goals whitelist), `PUT /api/subscription` (demo: client-reported plan and credit balance).
- Onboarding saves to D1 and prefills the name from Google; users without a profile are sent from `/dashboard` to `/onboarding`; finished users skip it.
- `PlanProvider` now loads plan, credits and profile from `/api/me` (default plan Free, was demo Pro Max in localStorage); `useStudyLevel` seeds Library, Flashcards and Leaderboard from the saved level; Settings level change is saved; sidebar shows the saved university.
- Shared validation and constants in `src/lib/profile.ts`.

## 7b9789f — iOS-style top bar and roomier mobile dashboard
- Top bar: translucent blurred bar (hairline border, backdrop-saturate) with a 44 pt row plus top safe-area inset. Phones: centred title, back chevron when inside a section, 44 pt menu button; subtitle, plan pill, credits and Upgrade hidden below md (the drawer's user card still shows the plan). md+: left title with subtitle, rounded-full pills and Upgrade. Home icon removed on phones.
- Dashboard: 20 pt side gutters, 36 pt section gaps, 28 px hero card with 48 px buttons, grouped "Today" list with inset hairline separators and 72 px rows, course rail bleeding to 20 pt edges, safe-area bottom padding.
- The hard-coded "Monday, 26 October" is now today's date in Accra time; the Home toolbar subtitle was removed.
- Desktop checked in Chrome; phone width not visually checked (the browser window would not resize below desktop width).

## 3663962 — Mobile top bar: thicker, page name left, plan right; scroll lock under the menu
- Phone top bar is 56 px (was 44) plus safe-area inset; page name left-aligned at 20 px bold (after a back chevron inside a section); plan pill on the right using the short name (Free, Pro, Max) with the shimmer on Max; menu button last. Desktop unchanged.
- Drawer scroll lock: while open, `<html>` gets `overscroll-behavior: none` and `<body>` `overflow: hidden`; the backdrop is `touch-none`; a non-passive touchmove handler swallows any drag that is not inside the menu list, and drags at the top or bottom of the list, so the page behind never scrolls, rubber-bands or pull-to-refreshes. The menu list uses `overscroll-contain`.

## 3d69ce9 — Show the page name only in the top bar
- `Title` (Articles, Library, Hot Topics, My Files, Case Law) no longer draws the big page name under the top bar; its h1 is `sr-only` so each page keeps one heading for screen readers and search. The intro line and right-hand controls (level select, tabs) remain.

## 8232388 — Library: hide the free-plan banner on phones
- The "You're on Attorney (Free)…" notice on Library is hidden below md; it still shows on tablets and desktop. The Max-only course notice is unchanged.

## 4f6caf0 — Production plan and credits are server-only
- New `DEMO_BILLING` flag (`NODE_ENV !== "production"`) in `src/lib/site.ts`.
- Production: Settings "Preview as plan" hidden; `PUT /api/subscription` returns 403; `setPlan` and `addCredits` do nothing and credit spend is no longer written; checkout shows "Payments are not open yet" instead of the fake Pay button. Plan and credits load only from D1 via `/api/me`.
- Development keeps the demo checkout and plan preview. Real plan changes will come from a payment webhook that writes the `subscription` table.

## Notion CMS pipeline
- New `cms_entry` table (migration 0002): one row per Notion page (course, topic, case brief, article, podcast episode, mock question) holding Markdown body, stage, and a published flag. A row is live only when its Stage includes "Publish" (or there is no Stage column) and its body is not empty.
- `POST /api/admin/sync` (Bearer `ADMIN_SYNC_TOKEN`) walks the Notion Law Database with `NOTION_TOKEN`, converts blocks to Markdown (`src/lib/notion/markdown.ts`), skips pages whose `last_edited_time` is unchanged, upserts in batches, and removes rows that vanished only after a full success.
- Site reads through `src/lib/cms.ts`: Library, course page, dashboard, topic reader (Markdown chapters split on `##`) and Case Law (CMS briefs merge with built-ins) fall back to built-in content when D1 has nothing or fails. Those pages are now dynamic.
- `scripts/seed-notion-outline.sql` loads the current outline (4 courses, 15 topics, all drafts) into local D1.
- Needs before production: `wrangler d1 migrations apply notifiedlaw-db --remote`, Notion integration shared with the Law Database, secrets `NOTION_TOKEN` and `ADMIN_SYNC_TOKEN`.

## Notion is the only content source
- Removed every built-in course, topic, case, statute, article, episode, flashcard, file, quiz, leaderboard name and canned AI reply (`lib/data.ts`, `lib/content.ts` now hold only config: levels, plans, prices, badges, onboarding options).
- Removed pages with no Notion source: Notified AI, Flashcards, My Files, Leaderboard, Legislation, Search. Their nav entries, sitemap and llms.txt entries are gone.
- Library, course page, dashboard, topic reader, Case Law, Articles (+ `/articles/[slug]`), Hot Topics (+ `/hot-topics/[slug]` write-ups) and Exam Prep (mock questions) all read `cms_entry` through `lib/cms.ts` and show an empty state when nothing is published. Outline topics without text show "Coming soon".
- Course slugs are now the slugified Notion title (e.g. `ghana-legal-system`); course colours cycle through a palette; reading time and chapter count come from the body.
- Landing page: removed the AI demo, podcast player card and the Flashcards/Legislation/My Files/Leaderboard highlights.
- Not changed: the hero promo video scenes and landing screenshots still show sample content; plan/credit copy still mentions AI.

## Courses grouped by semester
- Each level now lists its courses under First Semester / Second Semester headings (Library and Home); the course page header shows the semester. The semester comes from the Notion semester database name ("First/Second Semester Notes") stored on each course row; a level with one semester shows one heading.

## Edit profile in Settings
- Settings has a Profile form (name, date of birth, gender, phone, university, interests) that saves through `PUT /api/profile`, updates the cached profile (`setProfile` in `plan.tsx`) and syncs the account display name via `authClient.updateUser`. Level stays in the Studies group.

## Form validation and sanitisation
- `lib/profile.ts`: `clean()` (NFC, strips control/invisible chars and `<>`, collapses spaces), name charset check, real-calendar DOB check (1900 to 16 years ago), Ghana phone `normalizePhone()` (stored as `0XXXXXXXXX`), de-duplicated goals, and `profileErrors()` shared by the API and the forms.
- `lib/http.ts` `readJson()` caps request bodies at 8 KB; used by `/api/profile` and `/api/subscription`.
- Onboarding, Settings profile form and checkout MoMo number show per-field errors on blur, set `maxLength`/`aria-invalid`, and block submit while invalid. Search fields cap at 100 chars; the media route rejects control characters, backslashes and long keys.

## Signup: status question and branching follow-ups
- Onboarding is now: About you, "Which fits you best?" (student / employed / "Chale, I'm trying oo", required), optional follow-ups for that answer (with Skip), then goals.
- Follow-ups: student = university + level; employed = job title, employer, sector; exploring = what brings you here. Only the set for the chosen status is stored; switching status clears the old answers (level is kept, it is also the library's reading level).
- University list is the 19 Ghanaian law institutions (`lib/content.ts`); previously stored names still validate.
- New migration `0003_profile_status.sql` (adds `status`, `job_title`, `employer`, `sector`, `intent`; `university` and `level` become nullable). Hand-fixed the generated INSERT so it only copies existing columns. Not yet applied to remote D1.
- Settings profile form uses the same shared pieces (`components/profile-fields.tsx`) and shows what the server stored (`PUT /api/profile` now returns the cleaned profile).

## Onboarding card size
- All four steps share one grid cell (inactive ones `invisible`), so the card keeps the height of the tallest step and the buttons no longer jump. Header has a fixed min height.

## Mobile signup
- Auth page: on phones the hero is a compact banner (logo + smaller headline, no bullets) so the Google button is visible without scrolling. Onboarding card has tighter padding/gaps on phones.

## Law quotes
- New `quote` table (text, author, source, active) with migration `0004_quotes.sql`, which also seeds 20 quotes. `lib/quotes.ts` `randomQuote()` picks one active row at random per request; shown under the greeting on the dashboard. Not yet applied to remote D1.

## Rate limits and daily quote
- Quote of the day: `dailyQuote()` picks by UTC day number modulo active quote count (ordered by id), so refreshes show the same quote and it changes once a day. Replaces `randomQuote()`.
- Rate limits: `lib/rate-limit.ts` `limited()` uses Workers Rate Limiting bindings (`RL_WRITES` 20/min, `RL_READS` 120/min, `RL_ADMIN` 5/min, `RL_MEDIA` 300/min) declared in wrangler.jsonc. Applied to profile PUT/PATCH, subscription PUT, /api/me, admin sync (before token check), and /media. Keyed by user id, else IP; fails open without the binding.

## Server-side topic paywall (5c58adf)
- Security audit (cloudflare/security-audit-skill, guidance mode) found `/library/[course]/[topic]` sent full topic text to anyone; locks were client-only. Now `getPlan()` (lib/auth.ts) reads the plan from D1 and `topicLock()` (lib/data.ts, `FREE_TOPICS = 2`) decides; locked topics render the Reader with an empty body and a Gate. Client lists use `FREE_TOPICS`.

## Landing links (f50c12d)
- Landing nav (desktop and mobile menu) gains Articles -> /articles. Footer gets a site row: Library, Articles, Case Law, Pricing, Sign in, Create account, above the existing Privacy/Terms/Support row.

## Public articles shell (5cf63cf)
- `src/app/(app)/articles` moved to `src/app/articles` with a layout that picks `AppFrame` (new, `components/app-frame.tsx`, also used by the (app) layout) when signed in, else `PublicShell` (`components/public-shell.tsx`: landing-style top bar and footer, theme tokens). URLs unchanged.

## Shared signed-out top bar (5d9f464)
- Landing nav extracted to `components/site-nav.tsx` (`SiteNav`, with mobile menu); links now `/#features` etc. so they work off the landing page. Used by `landing.tsx` and `PublicShell`, so signed-out /articles shows the same bar.

## Top bar sizing (fa2793b)
- `SiteNav` now sets its own text-[17px], leading-[1.47], tracking-[-0.022em], colour and light colour scheme instead of inheriting them from the landing wrapper.

## Scrollbar gutter (1830935)
- `html:has([data-site-nav]) { scrollbar-gutter: stable; }` in globals.css; `SiteNav` carries `data-site-nav`. Stops the top bar shifting between long and short public pages. App shell (internal scroll) untouched.

## Auth page photo from R2 (f3f0a36)
- New barrister photo replaces `/photos/balme-library.jpg` on /login and /signup (`components/auth-form.tsx`). Rendered as an `<img>` with `srcSet` (480w, 768w, 1034w), `sizes="(min-width: 768px) 53vw, 100vw"`, `fetchPriority="high"`, `object-[50%_15%]` so the face stays in frame on the short mobile banner.
- Variants made with cwebp q78 from the 1034x1520 PNG (1.9 MB to 17/31/47 KB) and uploaded to the `notifiedlaw-videos` R2 bucket (remote and local) as `images/barrister-{480,768,1034}.webp`.
- `/media/[...key]` route now serves `.webp` as image/webp; images get `public, max-age=31536000, immutable`. wrangler.jsonc bucket comment updated.

## Google-branded sign-in button (09b0cbe)
- `components/auth-form.tsx`: "Continue with Google" now shows Google's multicolour G (inline SVG, 20px) and uses Roboto 500 via `next/font/google`. Pill shape, 44px tall. Unused `btn` class string removed.
- `globals.css`: new `.google-btn` with Google's colours: light #FFFFFF / #1F1F1F text / #747775 border; dark #131314 / #E3E3E3 / #8E918F for `data-theme="dark"` and system-dark. Subtle hover tint.

## Remove Balme Library photo (36e6a66)
- Deleted `public/photos/balme-library.jpg` (270 KB), unused since the auth pages moved to the R2 barrister photo. Its line removed from `public/photos/CREDITS.txt`.

## Restore removed sidebar links (7d00066)
- `lib/nav.ts`: Notified AI (/ai), Flashcards (/flashcards), Leaderboard (/leaderboard, proLock) and My Files (/files) back in the sidebar, with titles in `titleFor`.
- New private pages: /ai and /leaderboard show "currently unavailable" via `Empty`; /flashcards says cards are generated as course content is uploaded; /files renders the old screen (storage bar, search, filter chips, New folder / Upload buttons) all disabled, with a "Coming soon" card.

## Remove sidebar search (54c8348)
- `components/app-shell.tsx`: dropped the "Search cases, articles, topics" link to the deleted /search page. Search stays inside dedicated pages only.

## Private paths for restored pages (b77c2f2)
- `lib/site.ts`: /ai, /flashcards, /leaderboard and /files added to `PRIVATE_PATHS` so robots and llms.txt keep them unindexed.

## Desktop: no top bar, controls in sidebar (09f3785)
- `components/app-shell.tsx`: `Toolbar` gets `md:hidden` and loses its desktop-only pieces (subtitle, credits, full plan name, Upgrade, md:/1440+/1920+ sizing). Phone bar unchanged: back chevron, page name, sm+ theme toggle, short plan, menu.
- New `PlanBlock` in the desktop sidebar (not the phone drawer), between the nav and the profile row: full plan pill (shimmer on Max) + theme toggle; credits pill + Upgrade (hidden on Max). Pills use `bg-edge/[0.055]` because `bg-fill` vanishes on the sidebar background.
- Desktop page name now comes only from the highlighted nav item; page subtitles still render in content via `Title`.

## Remove sidebar settings cog (4fd503b)
- `components/app-shell.tsx`: dropped the cog SVG on the right of the profile row. The whole row still links to /settings.

## Library level flicker (8fe148a)
- Cause: `useStudyLevel` fell back to "200" until the client fetch of /api/me returned. With paint holding on refresh the old page (100) stayed up, then the SSR'd 200 showed, then 100 again.
- `lib/auth.ts`: new `getLevel()` reads `profile.level` for the session user.
- `library/page.tsx` fetches it alongside courses and passes `initialLevel`; `useStudyLevel(initial)` uses it before the profile loads. Verified the SSR HTML has 100 pressed.

## Hydration mismatch on profile row (41eee04)
- Error: server HTML had empty initials (PENDING user), client hydrated with "CK".
- Cause: `AppShell` sits in `<Suspense>` in `app-frame.tsx`, which hydrates after `SessionUser`; by then Better Auth's cached session was in context.
- `components/user.tsx`: `useUser()` uses `useSyncExternalStore` (server snapshot false) and returns PENDING until the caller's own subtree has hydrated. Verified no hydration errors on /library and /dashboard reloads.

## Plan and profile from the server (6470d90)
- Symptom: "You're on Attorney (Free)" banner (and Free plan pill, topic locks) flashed for Pro users on load.
- Cause: `PlanProvider` defaulted to Free and fetched /api/me in an effect.
- `lib/auth.ts`: `meFor(userId)` (profile + subscription, queried in parallel) and `getMe()`; replaces `getLevel`. `Me` type now in `lib/profile.ts`. `/api/me` uses `meFor`.
- `components/app-frame.tsx` is async, calls `getMe()`, passes `me` through `AppShell` to `PlanProvider`, which seeds its state and no longer fetches. Every (app) route was already dynamic, so nothing lost static rendering.
- Reverted the library-only `initialLevel` plumbing from 8fe148a; `useStudyLevel` reads the seeded profile.
- Verified SSR HTML: Senior Judicial (Pro), level 100, no banner; no hydration errors on /library, /articles, /settings.
- Seen, not fixed: local D1 profile row has `status = "status"`, so Settings shows the status as unanswered.

## Editable-looking profile fields (8edb0d1)
- Cause: inputs inside `text-muted` labels inherited the grey (preflight sets `font: inherit`), on a `bg-fill` background.
- `components/profile-fields.tsx`: `fieldCls` is `bg-surface`, hairline ring, blue focus ring, `text-ink font-normal`; `labelCls` is 13px semibold `text-ink`; "(optional)" hints `text-muted`, wrapped with the label text so they stay on one line.
- Settings `profile-form.tsx` and `onboarding.tsx` now use the shared classes instead of copies. Settings rows show values in ink, labels medium.

## Landing highlights: AI card, no images (78c5a15)
- `app/landing.tsx`: new "AI Assistant" card (#5856D6) third in `HIGHLIGHTS`; `slot`/`alt` fields and the card image block removed, cards padded evenly (`p-6 md:p-8`). `IMAGES` for the loader is now just exam.jpg (still used by the Exam Prep section).
- Deleted `public/landing/library.jpg` and `public/landing/case-law.jpg`.

## Library semester headings (0ca5117)
- `library/library-view.tsx`: the small grey uppercase label is replaced by a header with a 36px badge showing the semester number (`SEMESTER_COLOR`: 1 #007AFF, 2 #AF52DE, else grey), a 20px bold h2 and "N courses".
- Header is `sticky top-0` inside `.nl-content` with `bg-canvas/90` + blur, bleeding to the page gutters; each semester is its own sticky container so the next heading takes over. `mt-8` between semesters.
- Local data only has Level 100 First Semester, so the hand-over between two headings was not seen in the browser.

## Library: no coloured badges (8facdc4)
- `library/library-view.tsx`: removed the course abbreviation tiles (`abbr`, `c.color`) and the numbered semester badge (`SEMESTER_COLOR` gone).
- Semester header: 22px bold title, "N courses" right-aligned, 0.5px hairline under a `bg-canvas/85` blurred sticky bar.
- Course header: 17px semibold title + `Chevron`, hover dims.
- Dashboard course cards and the course page banner still use `abbr` and course colours.

## Dashboard: no coloured badges (f371e41)
- `dashboard/page.tsx`: semester label is a 17px semibold h3 with "N courses" right-aligned over a 0.5px hairline (was small grey uppercase).
- Course cards: removed the `c.color` gradient strip and `abbr` tile; now a row of title + "N topics · M available" and a `Chevron`. Phone swipe rail and sm/xl grid unchanged.
- Course page banner (`library/[course]/page.tsx`) still uses course colour and `abbr`.

## Course colour dots (9c55303)
- Colour is the existing per-course `color` from `lib/cms.ts` `PALETTE` (Apple system colours, assigned in order within each level).
- `library/library-view.tsx`: 10px dot before each course title.
- `dashboard/page.tsx`: same dot above the title, card background `linear-gradient(color 12% → 4%)` over `bg-surface`. Card shadow and hover shadow kept (no inline box-shadow).

## Course colour on Library titles (7f1a53c)
- `library/library-view.tsx`: dot removed; course title text uses `c.color`.
- `dashboard/page.tsx`: dot removed; the colour wash on each card stays.

## Home (dashboard) on phones (5b7c59f)
- `dashboard/page.tsx`: course rail (`-mx-5 flex snap-x overflow-x-auto`, 72% cards) replaced by `grid grid-cols-1 gap-2.5`; `sm:grid-cols-2 xl:grid-cols-4` unchanged.
- Cards: `min-h-[64px] px-4 py-3.5` on phones (`sm:p-4`), `active:opacity-70` tap feedback, title `min-h-[38px]` only from sm.
- Checked at 390px by loading the SSR HTML into an iframe `srcdoc` (the Chrome window is fullscreen and `frame-ancestors 'none'` blocks normal framing).

## University email + 7-day Pro trial (941bb6b)
- **Domains** (`lib/content.ts` `UNIVERSITIES[].domains`): each checked with `dig MX` and the website title. accramet.edu.gh, ashesi.edu.gh, central.edu.gh, gimpa.edu.gh, gfc.edu.gh, kaafuni.edu.gh, kuc.edu.gh, knust.edu.gh, lancaster.edu.gh, mountcrestuniversity.edu.gh + mountcrestuniversity.com, pentvars.edu.gh, presbyuniversity.edu.gh, ubids.edu.gh, ucc.edu.gh, uds.edu.gh, ug.edu.gh, upsa.edu.gh + upsamail.edu.gh, wiuc-ghana.edu.gh, zuc.edu.gh. Subdomains accepted (st.ug.edu.gh, stu.ucc.edu.gh, st.knust.edu.gh all have MX).
- **Schema** (migration 0005): `uni_email` (email PK, user_id unique, no FK), `uni_email_request` (user_id PK/FK, token_hash unique, expires_at, sent_at), `subscription.trial_ends_at`.
- **lib/uni-email.ts**: `checkUniEmail` (normalise: lower-case, strip +tag; domain or subdomain match), constants TRIAL_DAYS 7, LINK_MINUTES 30, RESEND_SECONDS 60. **lib/token.ts**: 32-byte base64url token, SHA-256 hex stored. **lib/email.ts**: `sendEmail` via `env.EMAIL` from no-reply@notifiedlaw.com, html + text.
- **POST /api/uni-email**: auth, RL_WRITES, profile university required, domain check, 409 if account already verified or address claimed, 429 within 60s of last send, upserts request (retires old link), sends; logs the link outside production.
- **POST /api/uni-email/verify**: token only (no session), RL_WRITES by IP; D1 batch inserts claim, deletes request, upserts subscription with `coalesce(trial_ends_at, now+7d)`. Race/conflict → 409.
- **/verify-uni**: confirm button page (scanner-safe), noindex, in PRIVATE_PATHS.
- **Plan**: `planOf(row)` in lib/auth.ts — Free + trial in future → Pro; used by `getPlan` (topic paywall) and `meFor`. `Me.subscription` adds `trialEndsAt`, `onTrial`; `Me.uniEmail`. PlanProvider: trial gives 0 monthly credits.
- **UI**: Settings `uni-email.tsx` card (input with domain hint, sent state with 60s resend countdown, verified badge, trial line); Current plan row shows "· trial until"; `Btn` gains `type` (default "button").
- **wrangler.jsonc**: `send_email: [{ name: "EMAIL" }]`; `cloudflare-env.d.ts` regenerated.
- Tested locally (simulated mail): wrong/lookalike domain 400, +tag/case normalised, resend 429, bad token 400, address claimed by another account 409 on send and verify, used token 400, happy path via UI → Pro trial until 4 Nov, second address on same account → 409, re-verify after freeing → trial date unchanged. Test rows removed afterwards.
- Not done: production needs `wrangler email sending enable notifiedlaw.com` (DNS) and `wrangler d1 migrations apply DB --remote` before deploy.

## Rate limits for university email (fc4c858)
- `wrangler.jsonc`: `RL_UNI_EMAIL` (namespace 1005, 3 per 60s); `cloudflare-env.d.ts` regenerated.
- `lib/rate-limit.ts`: `limitedBy(bucket, keys[])` (429 if any key is over) and `clientIp`; `limited` now wraps it.
- POST /api/uni-email: after the 60s resend check, daily cap `DAILY_SENDS` = 5 per account per rolling 24h window (`uni_email_request.sends` + `window_start`, migration 0006; kept across address changes), then `RL_UNI_EMAIL` on `user:`, `ip:` and `to:<address>`.
- POST /api/uni-email/verify: `RL_WRITES` then `RL_UNI_EMAIL` per IP.
- Tested locally: counter starts at 1, 6th send in the window → 429 even with a new address, window older than 24h → send allowed and counter back to 1. The Workers rate-limit binding fails open under next dev, so the per-minute/IP/recipient limits were not exercised locally.
- Production still needs: Email Sending enabled for notifiedlaw.com, `wrangler d1 migrations apply DB --remote` (0005 + 0006), deploy.

## SEO, AEO, GEO and accessibility pass
- **Canonicals**: removed the root `alternates.canonical: "/"` (every page without its own inherited it); set per page on signup, login, library, articles, case-law, course, article and case brief pages. Root `openGraph.url` removed for the same reason.
- **Metadata**: descriptions for library, articles, case-law and signup; course, article and case-brief pages get title, description (body excerpt fallback), OG (with image, since page-level `openGraph` replaces the root one) and Twitter cards. New `lib/seo.ts` (`excerpt`, `breadcrumbs`, `OG_IMAGE`).
- **Indexing**: `(private)` layout now exports `robots: noindex`; login noindex,follow; onboarding noindex. 404 page (`not-found.tsx`) is noindex with links to the main sections; `error.tsx` added.
- **Structured data**: course pages (Course + BreadcrumbList), case briefs (Article about LegalCase + breadcrumbs), articles use the shared breadcrumb helper; home gains WebPage and semester Offers with url/availability; Organization gains areaServed, contactPoint, knowsAbout; WebSite gains description.
- **AEO/GEO**: `llms.txt` gains a pricing section and links `/llms-full.txt` (new: FAQ + full article and case-brief text); `manifest.ts`; `public/.well-known/security.txt`; `lang="en-GH"`.
- **Accessibility**: skip link + `main#main` (tabIndex -1) on every layout (landing page now has a `<main>`; app shell `<main>` is the scroll container); global `:focus-visible` ring; `prefers-reduced-motion` blanket rule; contrast fixes (muted/faint tokens, new `--link` colour, blue darkened to #0066cc, landing tag/label colours); `aria-current` on sidebar links and reader chapters; nav landmarks labelled; hero promo controls moved out of the `role="img"` wrapper (children of role=img are hidden from assistive tech); scrollable card rails are keyboard-focusable regions; Escape closes the landing mobile menu; headings no longer skip levels (`Markdown` `from` prop; landing cards and tiers are h3); billing toggle grouped; result counts are `role=status`.
- Checked: `tsc --noEmit` clean, eslint clean (one old warning). Not run in a browser: the dev server on :3000 was stale and restarting it was declined.

## Security fixes from the security-audit-skill review
- **Exam Prep paywall** (`exam-prep/page.tsx`): checks `getPlan()` on the server; anything below Pro Max gets the `Gate` upgrade prompt and `getQuestions()` is never called, so the questions are not in the HTML.
- **Verification link origin** (`api/uni-email/route.ts`): built from `env.BETTER_AUTH_URL` instead of `req.url`, so the Host header cannot redirect the token. Dev uses `.dev.vars` (localhost).
- **Body cap** (`lib/http.ts`): `readJson` streams the body and aborts past 8 KB, so a request without content-length is no longer buffered in full.
- Checked: tsc and eslint clean; `readJson` exercised in Node with small, chunked, oversized (20 KB streamed), non-JSON, empty and UTF-8 bodies. Exam Prep gate not viewed in a browser.

## Tighten pricing to FAQ gap
- `src/app/landing.tsx`: FAQ section padding `py-[120px]` to `pb-[120px] pt-6`; both sections are white, so the gap was 240px, now 144px.
- Checked: not viewed in a browser.

## Lawyer mascot
- `src/components/live-mascot.tsx`: copy of page-mascot (MIT) adapted in tripadvert-web; `src/components/lawyer-mascot.tsx` wraps it with a wig, black gown and white bands as an SVG overlay; mounted in `landing.tsx`. Sprites in `public/landing/mascots/`.
- Fixed bottom-right, desktop only (>=721px). Checked: tsc and eslint clean; headless Chrome screenshot of the corner.

## Mascot desktop-only
- `lawyer-mascot.tsx` returns null below 721px instead of CSS-hiding. It is only mounted by the landing page (`/`).

## Wig turns with her
- `live-mascot.tsx`: `overlay` may be a function of the head direction. `lawyer-mascot.tsx`: per-direction shift, tilt and squeeze table for the wig, eased over 300ms. Offsets estimated from the sprite sheet. Checked: tsc, eslint, front view screenshot; turned poses not viewed.

## Wig removed
- `lawyer-mascot.tsx`: dropped the wig and its per-direction table; gown and bands remain. `live-mascot.tsx` still accepts an overlay function.

## Headwrap hairstyle
- `lawyer-mascot.tsx`: burgundy headwrap with gold band and side knot over the afro, following head direction via the `WRAP` table (offsets estimated). Checked: tsc, eslint, front view screenshot; turned poses not viewed.

## Top bun
- `lawyer-mascot.tsx`: headwrap removed; black curly top bun with gold hair tie on the crown, following head direction via the `BUN` table. Checked: tsc, eslint, front view screenshot.

## Glasses character
- Bun removed. `lawyer-mascot.tsx` now uses `public/landing/mascots/glasses-{directions,reactions}.webp` (from page-mascot) with the gown and bands re-fitted; afro sheets deleted. Blinking is off (`blink={false}`) because `live-mascot.tsx` eyelid boxes were traced for the afro sheet. Checked: tsc, eslint, front view screenshot.

## Dark skin
- `public/landing/mascots/glasses-*.webp` recolored by a one-off script (pillow/numpy in the scratchpad venv): skin pixels picked by hue/saturation/value, remapped to deep brown; hair, shirt, glasses and eyes untouched. Originals are in the session scratchpad only; re-download from page-mascot to redo. Blush and lip tint were flattened. Checked: both sheets and the corner screenshot.

## Lighter skin
- Same recolor script, base skin tone lifted from (0.50,0.27,0.15) to (0.66,0.40,0.24) for a light brown. Checked: directions sheet and corner screenshot.

## Afro skin tone and black hair
- Recolor script: skin target now matches the afro sprite (about rgb 165,86,46); hair and the brown linework remapped to near-black by hue/saturation. Known flaw: the shadow under her chin reads grey. Checked: both sheets and corner screenshot.

## Scientist character
- `lawyer-mascot.tsx` now uses `public/landing/mascots/scientist-{directions,reactions}.webp` (page-mascot). Goggles painted out of the directions sheet by a one-off script (grey mask, nearest-hair fill plus curl noise; opencv in the scratchpad venv); gown re-fitted over the lab coat. Glasses sheets deleted. Hair stays the sprite red-brown; blinking still off. Known flaws: a few small strap remnants and mottled hair where the goggles were. Checked: both sheets, corner screenshot.

## My Files storage
- Private R2 bucket `notifiedlaw-files` (binding `FILES`); keys `users/{userId}/{fileId}`, never from the name. D1 table `user_file` (migration 0007) holds name, kind, size, sha256.
- Quotas in `src/lib/data.ts` `PLAN_STORAGE`: Free 500 MB, Pro 5 GB, Max 10 GB; university trial counts as Pro. 25 MB per file (`MAX_FILE_BYTES`). Space reserved by one conditional INSERT, so parallel uploads cannot overshoot.
- `src/lib/file-check.ts`: type from bytes, not name. PDF: rejects JavaScript/JS, Launch, embedded files, RichMedia, XFA, SubmitForm, ImportData, GoToE/GoToR, encryption; decodes #xx names; inflates object streams. DOCX: rejects macros, ActiveX, OLE embeddings, DDE fields, external templates/objects/images, non-http(s)/mailto external links, ZIP traversal, duplicates, zip bombs, encrypted/old .doc.
- API: `GET/POST /api/files`, `GET/DELETE /api/files/[id]` (owner-only; others get 404). Downloads `private, no-store`, nosniff; `?view=1` opens PDFs inline.
- UI: `files/files.tsx` upload (button + drag-drop), search, PDF/DOCX filter, storage bar, two-step delete. Folders not built.
- Checked: tsc, eslint; checker on 17 malicious samples (all refused) and 125 real PDFs/DOCX (124 pass, 1 malformed fixture refused); E2E on dev: upload, download bytes match, cross-user 404, quota full, 5 parallel uploads, plan quotas, delete. UI not viewed in a browser.
- Not done: `wrangler r2 bucket create notifiedlaw-files`, remote D1 migration, R2 cleanup on account deletion, antivirus scanning.

## Student plan replaces Free; paid-only app
- Plans: `None` (unpaid) | `Student` | `Pro` | `Pro Max` in `src/lib/data.ts`; `PAID_PLANS`, `isPaidPlan`. Prices GH₵60/160/360 a month in `src/lib/content.ts` `PLAN_PRICES`; semester billing removed everywhere (landing, plans, checkout, JSON-LD, llms.txt, FAQ, terms, hero promo).
- Library: any paid plan opens every Level 100–400 topic; Pre-Bar/Bar stay Max. Unpaid and guests keep a 2-topic preview (`PREVIEW_TOPICS`), labelled PREVIEW.
- Paywall: dashboard, ai, exam-prep, files, flashcards, hot-topics, leaderboard moved into `(private)/(paid)/` whose layout redirects `None` to /plans. Plans, checkout, settings stay open. Upload API returns 402 without a plan.
- University trial still grants Pro; copy that said Max (signup, auth form, FAQ, llms.txt, plans footnote) now says Senior Judicial.
- Migration 0008: subscription default `None`; old `Free` rows become `None`.
- Checked: tsc, eslint, redirects for unpaid vs Student, prices on landing and llms.txt, upload 402, topicLock unit table. Topic reader not exercised (no local topic content).

## My Files folders
- `user_folder` table (migration 0009) and `user_file.folder_id`. Nested up to 8 deep, 500 per user; cycles refused.
- API: `POST /api/folders`, `PATCH/DELETE /api/folders/[id]` (delete removes subfolders and their files from R2), `PATCH /api/files/[id]` rename (extension kept) or move, upload into a folder with `x-folder-id`. Every folder id is checked against the caller's own folders.
- UI: breadcrumbs, New folder, per-row ⋯ menu with Rename, Move to, Delete (folder delete says how many files go with it); search spans all folders and shows each result's path.
- Also fixed: `site.ts` must import `./content` relatively, because next.config.ts loads it (the `@/` import broke config loading).
- Checked: tsc, eslint, E2E on dev for create, nesting limit, cycle and self moves, rename, move, cross-user 404s, recursive delete. UI not viewed in a browser.

## Delete account
- Better Auth `user.deleteUser` enabled in `src/lib/auth.ts`; `afterDelete` calls `purgeUserObjects` (`src/lib/files.ts`), which lists and deletes the `users/{id}/` prefix in R2. D1 rows go by cascade (uni_email kept on purpose, so the trial cannot be reused).
- Google-only accounts have no password, so deletion needs a session under a day old (Better Auth freshAge); otherwise SESSION_EXPIRED and the UI asks the user to sign in again.
- Settings: "Delete account" group with a two-step confirm.
- Checked: E2E on dev: rows for user, files, folders, subscription gone; R2 object gone; other user unaffected; 3-day-old session refused.

## ClamAV virus scanning
- `scanner/` (Dockerfile on clamav/clamav:1.4 + python3 HTTP front end `server.py` speaking clamd INSTREAM on 3310; signatures baked at build, freshclam keeps them current). Runs as a Cloudflare Container: `Scanner` class in `custom-worker.ts` (new Worker `main`, wraps `.open-next/worker.js`), binding `SCANNER`, standard-1, 1 instance, sleeps after 30 min idle.
- `src/lib/scan.ts`: every upload is scanned after the content checks; infected → 422, scanner down or erroring → 503 (fails closed). `next dev` skips scanning (no containers).
- Checked: tsc, eslint, opennext build, `wrangler deploy --dry-run --containers-rollout=none` (bindings resolve), dev still uploads. Image built for linux/amd64 (191 MB, signatures baked) and run locally: clean PDF/DOCX pass, EICAR and EICAR inside a zip caught, 16 MB PDF in 5 s, 25 MB accepted, ~1 GiB RAM, cold start to first scan 13 s under emulation. Not yet run on Cloudflare.

## Remove Notify Credit packs
- Dropped `CREDIT_PACKS`, the "Need more Notify Credits?" section on /plans, the `?credits=` checkout path, Settings "Buy more credits" link, and the shell pill's `#credits` "buy more" link (now goes to /plans).
- Credits are now the monthly plan allowance only: removed `extra`/`addCredits` from `usePlan`, `creditsExtra` from the subscription API, `Me`, and schema. Migration `0010_drop_credits_extra.sql` drops the column (applied locally; production needs `wrangler d1 migrations apply DB --remote`).
- Checked: tsc, eslint.

## e3c0b82 — Split sign-up into student and professional paths
- Sign-up page first asks "student or professional". Professionals continue with Google; students enter a university email and get a one-time sign-in link (Better Auth magic-link plugin, `src/lib/auth.ts`). Login page offers Google plus the student email link.
- Emailed link opens `/verify-email`, which signs in only on a button press (mail scanners cannot spend the token), then goes to onboarding. Expired or reused links come back with `?error=`.
- New `student` table (user, university email, university, student ID, verifiedAt) written by a session-create hook whenever a user with a verified university-domain email signs in. This refreshes verifiedAt each sign-in; Google Workspace university accounts count too.
- New `student_link` table: 60s resend wait and 5 links a day per address. RL_UNI_EMAIL now limits per recipient and per IP. Tokens are stored hashed and last 15 minutes. Only allowlisted university domains; capitals and +tags are rejected.
- Student onboarding: about you, then studies (fixed university, required student ID, level), then goals. Student IDs are unique per university (`student_university_student_id` index); a clash returns 409. `/api/profile` forces status student and the email's university for student accounts. Onboarding sets the account name and sends users to /plans.
- Student plan needs a student account verified within 365 days (`STUDENT_VERIFY_DAYS`), checked in /plans, /checkout and `/api/subscription`. Expired students get a "Re-verify" button that emails a new link.
- Removed the Settings university-email card, `/api/uni-email`, `/verify-uni`, `src/lib/uni-email.ts` and the 7-day trial (`planOf` no longer grants Pro). Settings shows a read-only Student group; the profile form hides status and university for students.
- Migrations 0011 (drop `uni_email`, `uni_email_request`, `subscription.trial_ends_at`) and 0012 (create `student`, `student_link`). Copy updated on the landing page, FAQ, llms.txt and signup metadata.

## 03d55a9 — Rate-limit every Worker request and add Turnstile to student sign-in
- New RL_PAGES binding (600 requests/60s). `custom-worker.ts` checks it on every request that reaches the Worker (pages, RSC, API, media); static assets never reach the Worker. 429 with retry-after 60 when over.
- `src/lib/client-key.ts`: rate-limit key is the signed-in session (Better Auth cookie HMAC checked against BETTER_AUTH_SECRET, no D1 read, key stores a hash) else the IP. Forged cookies fall back to IP. /media now uses this key instead of IP only.
- Turnstile on the student email form (`src/components/turnstile.tsx`, managed mode, one widget reused for Resend, reset after each send). Token goes in `x-turnstile-token`; `sendStudentLink` verifies it via Siteverify (`src/lib/turnstile.ts`) before rate limits or sending. Fails closed in production.
- Widget "NotifiedLaw student sign-in" created on the account for notifiedlaw.com, site key in `src/lib/site.ts` (test key outside production). Production needs secret TURNSTILE_SECRET_KEY set before deploying; .dev.vars uses Cloudflare's test secret.
- `scripts/waf-rate-limit.sh`: creates/updates zone WAF rate limiting rule `notifiedlaw-ip-flood` (300 req/10s per IP, excludes /_next/static/, block 10s). Needs an API token with Zone WAF Edit; not yet run.
- Checked: tsc, eslint, clientKey against better-call's signer (valid, forged, garbage, no cookie), opennextjs build, wrangler deploy --dry-run. Not yet tested in a browser.

## 802b32d — Drop the WAF rule; block over-limit clients for 10 minutes in the Worker
- Removed `scripts/waf-rate-limit.sh` (user does not want WAF).
- `custom-worker.ts`: a session or IP that goes over RL_PAGES goes in a per-isolate block list for 10 minutes (retry-after counts down). Blocked requests get a 429 before Next.js runs and skip the RL_PAGES call. List capped at 10,000 keys, oldest dropped first; RL_PAGES still applies if an isolate restarts.
- Checked: tsc, eslint.

## 9815415 — Count rate limits per user, not per session; cap daily uploads
- `src/lib/client-key.ts`: after the cookie signature check, looks the session token up in D1 (`session.token`) to get its user; key is `u:<userId>`. Cached per isolate (5 min for live sessions, 1 min for dead ones, 20,000 entries). Signed-out, expired or forged cookies, and D1 errors, count by IP. Forged cookies never reach D1. `clientKey` now takes `env` (DB + secret); custom-worker.ts and /media updated.
- Daily upload allowance: `DAILY_UPLOADS` 100 and `DAILY_UPLOAD_BYTES` 1 GB per user per UTC day (`src/lib/data.ts`). `countUpload` in `src/lib/files.ts` is one atomic upsert on new table `upload_day` (migration 0013). Checked in POST /api/files after the file checks and before the virus scan; 429 when over.
- Migration 0013 applied locally; production needs `wrangler d1 migrations apply DB --remote` before deploying or uploads fail.
- Checked: tsc, eslint, clientKey with stubbed D1 (two sessions → one user, expired/signed-out/forged → IP, cache hit), upsert in SQLite (file cap, byte cap, day reset), opennextjs build, wrangler deploy --dry-run.

## c9de1cb — Allow one signed-in device per account
- `databaseHooks.session.create.after` in `src/lib/auth.ts` now deletes every other session of the user before recording student status. The old device's next request finds no session (no cookie cache, so it is immediate) and it is treated as signed out.
- Checked: tsc, eslint; on the local dev server, signed in one student twice with separate cookie jars: device A had a session, then after device B signed in A's get-session returned null and B's worked. Test account removed from local D1.

## fe935f7 — Tell a device why it was signed out after a sign-in elsewhere
- New table `ended_session` (token_hash PK, ended_at; migration 0014). `endOtherSessions` in `src/lib/auth.ts` stores the SHA-256 of each other session's token, then deletes those sessions (in batches of 40), and prunes rows older than 30 days.
- `signedOutElsewhere()` reads the browser's leftover session cookie (better-auth `getSessionCookie`) and looks its hash up. /login passes the result to `AuthForm` as `elsewhere`, which shows the notice above the sign-in options. Private pages already redirect signed-out users to /login, so the old device sees it on its next visit.
- Migration 0014 applied locally; production needs `wrangler d1 migrations apply DB --remote` before deploying, or every sign-in fails in the session hook.
- Checked: tsc, eslint; on the local dev server, after device B signed in, device A's /dashboard redirected to /login and the notice showed; device B stayed signed in; a fresh browser saw no notice. Test data removed from local D1.

## ef828b7 — Add TimeTable: a private study plan built from courses, exam dates and free time
- New Study nav item "TimeTable" (`/timetable`, calendar icon), under the paid layout like the other Study pages. Top-bar subtitle "Your personal study plan".
- `src/lib/timetable.ts` (pure, shared by client and API): `cleanTimetable` validates input (1–12 courses, name ≤80 chars, real exam date ≤1 year ahead, optional HH:MM exam time, difficulty Light/Medium/Hard, 7 weekday hours 0–12 in half hours with at least one day > 0, start time, session 30/45/60/90/120 min, break 0/5/10/15/30 min). `buildPlan` runs from today to the last exam (max 180 days): each day's free hours cut into sessions from the start time; the day before an exam opens with a "Final review" of that course; other sessions go to the course furthest behind its share (difficulty × (1 + 7/days to exam)); no course on or after its exam day; no back-to-back repeats while another course waits. Dates in UTC (= Accra time).
- New table `timetable` (user_id PK → user, cascade; `input` JSON; updated_at), migration 0015. One timetable per user.
- `PUT /api/timetable` saves (upsert) for the signed-in user only, after WRITES rate limit and a plan check (402 with no plan); `DELETE /api/timetable` removes it. No GET: the page reads the owner's row server-side by session user id.
- Page: editor (courses with datalist of Library course titles, exam date/time, difficulty; weekly hours; start time, session and break length) and plan view (exams with countdown and planned hours; day cards with sessions, exam rows and rest days, 14 days at a time; Edit; Delete with inline confirm).
- Migration 0015 applied locally; production needs `wrangler d1 migrations apply DB --remote` before deploying, or the TimeTable page errors.
- Checked: tsc, eslint, planner unit run (shares, reviews, no study on/after exam, validation errors); on a restarted local dev server with two throwaway users: save 200, plan rendered, second user saw only the empty editor, no-plan user got 402, delete 200 and row gone. Test users removed from local D1.

## 2063a20 — TimeTable: calendar view with sessions you can move, change, add and delete
- New table `timetable_session` (id, user_id → user cascade, course_id, date, start_time, end_time, review; index user_id+date), migration 0016. Sessions are stored rather than generated on view, so calendar edits persist.
- `src/lib/timetable-db.ts`: `canPlan` (any paid plan), `timetableFor` (owner's input + sessions), `saveTimetable` — one raw D1 batch: upsert input, delete sessions dated today or later and any whose course was removed, insert the rebuilt plan through `json_each` from one JSON parameter (Drizzle's batch cannot hold `db.run`; one parameter stays under D1's bind limit). Past sessions of kept courses survive a rebuild.
- `src/lib/timetable.ts`: `StoredSession`, `planSessions`, `cleanSession` (course must be in the timetable, date within a year of today, 15 min–4 h, end may be 24:00), `clash` (same-day overlap), `MAX_SESSIONS` 5000; `toMins`/`toHhmm`/`weekday` exported; `minutesByCourse` now sums real session lengths.
- API: `PUT /api/timetable` returns `{ input, sessions }`; `DELETE` removes the timetable and all sessions in one batch. New `POST /api/timetable/sessions` (add) and `PATCH`/`DELETE /api/timetable/sessions/[id]` (move/change/delete). All scoped by session user id; other users' ids return 404; overlaps return 409.
- UI (`calendar.tsx`): Month (6×7 grid, chips on sm+, dots on phones, drag a chip to another day, day number opens its week), Week (time grid, 60 px/hour, from the earliest of start time and the week's sessions, at least 8 h; drag to a day and time snapped to 15 min; tap empty space to add at that half hour; exams in day headers; sticky hour column; on phones opens scrolled to today), List (the earlier day list; sessions tappable). Moves are optimistic and rolled back if refused. Session dialog: course, date, start, length; Save, Cancel, Delete session; Escape and backdrop close it. Editor warns that saving rebuilds from today; button reads "Save and rebuild".
- Shared editor/calendar styles moved to `timetable/shared.ts`.
- Migration 0016 applied locally; production needs both 0015 and 0016 applied remotely before deploying.
- Checked: tsc, eslint; on the local dev server with two throwaway users: build 53 sessions with 2 final reviews, move 200, overlap 409, unknown course 400, 17 h session 400, add 201, other user's PATCH/DELETE 404 and empty editor for them, rebuild kept a past session and dropped a removed course's and a future manual one; headless Chrome: week, month, dialog open/close by Escape, simulated drag to Fri 21:00 saved and still there after reload, phone width with no page-level horizontal scroll. Test users removed from local D1.

## c6b48e5 — TimeTable: open on the calendar, with a setup prompt before the first plan
- Problem: a user with no saved timetable only ever saw the setup form, so the calendar looked missing.
- `timetable.tsx`: the calendar always renders first; with no saved timetable it gets an empty state (default input, no courses, no sessions) and `empty`. The setup form opens from "Set up timetable" or "Edit setup", and Cancel always returns to the calendar. Deleting the timetable now goes back to the empty calendar.
- `calendar.tsx`: `empty` shows a "Fill this calendar with a study plan" card with a "Set up timetable" button and hides Add session, Edit setup, Delete and the "exams behind you" notice. With no courses, tapping the week grid does nothing and the add cursor is off.
- Checked: tsc, eslint; headless Chrome with a throwaway user: empty week calendar showed, Set up → form → Build my timetable put 11 sessions on the calendar. Test user removed.

## 556f6c0 — TimeTable: build and edit the plan on the calendar itself; drop the setup form
- Setup form removed; the page is the calendar. Files: `timetable.tsx` (state, saves, toolbar, guide, course chips), `views.tsx` (Month/Week/List), `dialogs.tsx` (all dialogs), `shared.ts` (styles, formatting, `Dialog`/`Ctx` types, drag payload types). `calendar.tsx` deleted.
- Input model (`src/lib/timetable.ts`): `{ courses, free, sessionMins, breakMins }`. Courses may have no exam yet (`examDate: ""`). `FreeBlock { id, day 0=Mon, start, end }` repeats weekly; up to 40, no overlaps within a day, end may be 24:00. Old `hours`/`startTime` gone; `timetableFor` merges stored input over `DEFAULT_INPUT`.
- Planner: `buildPlan(input, today, keep, nowMins)` fills each day's free blocks from today to the day before the last exam, skipping time taken by `keep` sessions and, today, time already past. The day-before-exam final review and fair-share weighting stay the same. Courses without an exam are not planned.
- New `auto` column on `timetable_session` (migration 0017). Planner sessions are auto; adding, moving, resizing or changing a session makes it the student's own (auto false). `POST /api/timetable/plan` deletes auto sessions from today on and inserts a new plan around the rest (409 with no upcoming exam or no free time). `PUT /api/timetable` now only saves input (and deletes sessions of removed courses); it no longer rebuilds.
- Week view: grid from 06:00 (earlier if needed) to 24:00 at 48 px/hour in a 72vh scroll box with sticky day headers and hour column. Mouse: drag over empty time picks a span (15-min snap, live preview); a plain click picks a session length at the half hour. Touch: tap does the same. Sessions and timed exams drag to another day and time; untimed exams show in day headers and drop onto days. A session's bottom edge drags to resize (15 min–4 h; refused overlaps show an error). Free time is a green band with a tappable strip on the right edge; blocks leave that edge clear. Opens scrolled to today and to the week's first event.
- Month view: tap a day cell to add (default time = that weekday's first free time, else 18:00); sessions and exams drag between days; the day number opens its week. List view gains "+ Add" per day; exams there open the exam dialog.
- Dialogs: New (Study session / Exam / Free time; defaults to Exam until an exam exists, then Free time until free time exists, then Study session; course picker with "+ New course…" and difficulty), Session (change course/date/times, delete), Exam (date/time, remove exam), Free time (day/times, remove), Course (from chips: name, difficulty, optional exam; delete with session count confirm), Plan (session length, break, explains what is replaced). Escape and backdrop close; first field focused.
- Page: a three-step guide (exams → free time → plan) shows until all are done; course chips with exam countdown and "+ Add course"; "Plan my sessions" in the header; "Clear TimeTable…" with inline confirm at the bottom.
- Migration 0017 applied locally; production needs 0015, 0016 and 0017 applied remotely before deploying.
- Checked: tsc, eslint; planner run (free blocks, now-cutoff, kept session avoided, overlap validation, 24:00 end); API with throwaway users (plan 409s, own session kept and planned around, re-plan replaces only auto, course removal deletes its sessions, other user isolated); headless Chrome with real mouse events: drag-create an exam with a new course, drag-create free time, Plan (notice + sessions incl. final review), bottom-edge resize saved and kept after reload, refused overlapping resize, Month view, phone width (no page-level horizontal scroll, course names visible in blocks). Test users removed.

## 3f5dfbf — TimeTable: Apple-style calendar that fills the screen on desktop
- Layout: on md+ the page fills `main` (`md:h-full`); lg+ adds a 236px sidebar with Plan my sessions, a mini month (dots on days with events), course list with show/hide checkboxes, Add course, getting-started steps, Clear TimeTable. Below lg: course chips and the next step above the calendar.
- Toolbar: bold month (or "Oct – Nov" across months) with the year in grey, Month/Week/List segmented control, grouped ‹ Today › buttons.
- Week view: hour scale fits the remaining height (ResizeObserver), sticky blurred day header with today in red, all-day row for untimed exams, red now-line with time label (hour label under it hidden), overlapping events in lanes, tinted blocks with a colour bar, solid when selected. Free time is a green band with a 5px strip to open it.
- Drag fix: the dragged event stays mounted at 35% opacity while a ghost follows the pointer; removing it had dropped pointer capture so drops never saved.
- Month view: 6-row grid filling the height; agenda List view with sticky day headers.
- Popovers (dialogs.tsx): portaled to body, placed right or left of the anchor with an arrow, clamped to the viewport, Escape/outside click closes; phones get a bottom sheet with grabber and backdrop. Grouped rows, iOS switch for all-day exams, footer with destructive action left, Cancel and blue pill primary.
- Toasts replace inline error/notice text; auto-hide after 4.5–6 s.
- globals.css: tt-pop, tt-sheet, tt-fade keyframes; disabled under prefers-reduced-motion.
- Tested in headless Chrome: no page scroll at 1024×700, 1280×800, 1536×864 in Week, Month and List; popover positioning; drag-move saved to D1; phone sheet; no horizontal scroll at 390px; no console errors.

## 24a8897 — Library: publish any Notion topic with content, and tidy PDF-pasted notes
- sync.ts: `published = body.trim().length > 0`; Stage column ignored (stagePublished removed). Bodies run through tidyMarkdown on fetch and on reuse of cached bodies, so existing content is reformatted on the next sync.
- tidy.ts (new): ligatures → plain letters; PDF line breaks inside paragraphs flattened; single-line paragraphs joined when the previous line doesn't end a sentence, ends in "v.", or the next starts lowercase, is digits only, or is a "[1968]" citation after ";"/","; list items take their continuation lines; ALL-CAPS lines (no digits except a leading "2. ") → "## " Title Case chapters; bold-only lines → "### "; bold headings split over two lines rejoined (number-only first part, lowercase start, or trailing small word). Idempotent.
- Checked on the 3 topics with content: chapters Offer and Acceptance / Offer / Bilateral and Unilateral Contracts etc.; local sync published 3 topics; topic page renders at /library/contract-law-i/2.
- Deployed by the user 2026-10-29 12:36 (Worker version ecee2a29; scanner container still fails without Workers Paid). Production sync: published 3, all three topic pages return 200 with no ligatures left.

## 938caaf — Promo codes: NOTIFIEDLAW26 gives Supreme Justice (Max) free for 3 weeks, until 31 Dec 2026
- Migration 0018_promo_codes: `subscription.promo_plan`, `subscription.promo_until`; new `promo_redemption` (user_id, code, redeemed_at; PK user_id+code; cascade on user delete).
- src/lib/promo.ts: PROMOS table (NOTIFIEDLAW26 → Pro Max, 21 days, last day 2026-12-31 UTC); normalizeCode (uppercase, spaces stripped); promoFor(code, now); effectivePlan(row) = higher of own plan and unexpired promo plan.
- planOf now uses effectivePlan; `planCols` selects plan + promo columns. Updated getPlan, meFor, quotaFor (files), canPlan (timetable). Me.subscription gains `promoUntil` (only while the promo plan is the one in use).
- POST /api/promo: 401 signed out, WRITES rate limit per account, 400 bad/ended code, 409 already used or already on Max; redemption insert + subscription upsert in one D1 batch (PK makes a racing second use fail). Own `plan` column untouched.
- UI: components/promo-code.tsx on Plans (open by default with no plan) and in the Checkout summary; success reloads so the plan shows everywhere; green note "Supreme Justice (Max) is yours until …" while active.
- Tested locally: 401/400/200/409 paths, case and space handling, Student user goes Max then back to Student after expiry, no-plan user goes Max then None (paid pages redirect to /plans, API 402), code cannot be reused after expiry; cutoff 2026-12-31 23:59:59 valid, 2027-01-01 not. Browser: enter code, apply, reload shows Max, 500 credits.
- 0018 applied remotely and deployed 2026-10-29 12:50 (Worker version 9736aa6d). Live /api/promo answers 401 for guests; main pages 200.

## 9913f28 — Promo code: confetti and a confirmation popup when a code is applied
- promo-code.tsx: on a successful redeem, renders <Unlocked> in a portal: canvas confetti (220 pieces, two corner bursts, gravity and flutter, fades by 5.2 s, disabled under prefers-reduced-motion) and a modal: 🎉 badge, "You're on Supreme Justice!", free-until date, four perks, "Start studying" (→ /dashboard, focused) and "Stay on this page" (reload). Escape reloads. No auto-reload any more.
- globals.css: nl-pop (springy scale-in) and nl-fade keyframes.
- Tested locally in headless Chrome: confetti visible, popup content and focus correct, canvas clear after the animation, reload shows "Supreme Justice (Max) is yours until …". Test user removed. Deployed 2026-10-29 12:55.

## 6ab8829 — Library: clean bold headings, and AI Summary and topic podcast marked coming soon
- Cause of asterisks: the topics were edited in Notion into heading blocks with bold text, giving "## **NATURE AND ESSENCE OF CONTRACT**", shown raw in the chapter pills. tidy.ts now strips ** (and a wrapping * or _) from heading lines, title-cases all-caps ones and drops a trailing . or :.
- Bold-only lines containing figures (citations like "**2 GLR 151**", "**Falck v. Williams [1900] AC 176**") stay bold paragraphs and can take the following continuation line.
- TIDY_VERSION (2) saved as props._tidy; sync reuses a stored body only if the page is unchanged and _tidy matches, so rule changes reach every page (first local sync re-fetched 15, the next 0).
- Reader: <Summary> (sparkle tile, Coming soon pill, skeleton bullets, disabled "Summarise this topic") in a 300px sticky aside at xl+, inline above the text below xl. <Podcast> sticky at the bottom of the article: gradient headphones tile, "Listen to this topic", Coming soon, "AI podcast · about N min" (60% of read time), disabled 15s back / play / 30s forward, empty progress bar.
- Checked locally at 1440 and 390 px: no asterisks in any of the 3 topics' headings, no horizontal scroll. Note: several headings (Offer, Tender Notices, Bilateral and Unilateral Contracts, Objective Test) were removed in Notion, so topics 1 and 2 now have fewer chapters.
- To ship: deploy, then run the sync (it re-reads all pages once because of TIDY_VERSION).

## f75c04e — Library: courses and topics follow the Order column in Notion
- Notion's API can't read drag order, so an "Order" number column was added to FIRST SEMESTER NOTES, SECOND SEMESTER NOTES and the four TOPIC OUTLINE databases (Contract Law I, Ghana Legal System, Legal Methods, Constitutional Law I), with a description telling editors lowest goes first and 2.5 sits between 2 and 3.
- Filled 1..n in the current Notion view order (courses: Constitutional Law I, Contract Law I, Legal Methods, Ghana Legal System; Con II, Contract II; all 8 Contract Law I and 7 Ghana Legal System topics).
- sync.ts: `orderOf(page)` reads the number column (any casing); `queryDb` stable-sorts rows by it, rows without one after, in created_time order. Applies to courses, topics and every section database; positions and topic URLs (/library/{course}/{n}) follow.
- Local sync verified: Contract Law I topic 3 = Formation II, Ghana Legal System 1..7 as in Notion. Only "Historical Overview" has body text in Notion right now; the other topics are empty there, so they stay unpublished.

## 245ac7c — Library: highlight a passage and keep a note on it, saved to your account
- New D1 table topic_note (migration 0019_topic_notes): id, user_id (cascade delete), topic_id (the topic's Notion page id, so notes survive reordering), chapter, quote, before (≤60 chars ahead of the quote, to tell repeated phrases apart), note, created_at, updated_at; index on (user_id, topic_id).
- API: GET /api/notes?topic= (READS limit), POST /api/notes, PATCH and DELETE /api/notes/[id] (WRITES limit). Owner-only by user_id in every WHERE. POST checks the topic is published and open on the reader's plan (403 otherwise), cleans quote (one line, ≤1000) and note (line breaks kept, ≤2000), caps 200 notes per topic.
- cms.ts: getTopicBody returns the topic id; new topicPlace(id) gives level and number for the plan check; course chapter counts now use splitChapters.
- Reader: selecting text in the chapter shows an "Add note" pill (above the selection, below on touch). Wide screens (xl+): "My Notes" panel at the top of the right column with the composer, notes for this chapter first, then other chapters; panel scrolls within the viewport height. Narrow: composer is a bottom sheet, notes list follows the chapter.
- Noted passages painted with the CSS Custom Highlight API (no DOM changes); clicking a note scrolls to its passage (opening its chapter), clicking a marked passage selects its note. Edit inline, delete with an inline confirm. Notes whose passage changed in Notion say so.
- Signed-out readers get a "Sign in" prompt instead of the note field.
- Fix: a Notion heading 1 right above a heading 2 made an empty chapter ("Nature and Essence of Contract"); splitChapters now makes the second heading a subheading of the first.
- Tested locally in headless Chrome at 1440 and 390 px: add, save, reload (persists, highlighted), jump, phone sheet, no horizontal scroll. API: 401 signed out, 400 empty quote, 403 unpublished topic, 404 for another id.
- To ship: apply 0019 remotely, deploy, then sync.

## ffffb32 — Library: topic text can be highlighted for notes, copying still blocked
- Cause: `body { user-select: none }` (copy protection) stopped any selection, so the "Add note" pill never appeared.
- Topic text now carries `.nl-selectable` (user-select: text) when notes are on. CopyGuard still cancels copy, cut, right-click and drag; iOS callout stays off.

## 33c780b — Library: right sidebar with AI Summary and Notes tabs
- Topic reader has a right sidebar (340px, full height, own scroll) with a segmented tab bar: AI Summary | Notes (note count badge). Opens on Notes. Arrow keys switch tabs.
- Below 1280px it slides in from the right as a drawer, opened by a "Summary & Notes" button by the read time; closes with ×, Escape or tapping outside.
- Add note, or tapping a highlighted passage, switches to Notes (and opens the drawer on phones). Picking a note closes the drawer and scrolls to its passage.
- Removed the inline Summary card, the notes block under the text, and the bottom composer sheet.
- Tested in headless Chrome at 1440 and 390px: sidebar, drawer, tab switch, select passage → Add note → composer in Notes tab, copy event still cancelled, no horizontal scroll.

## b4b1599 — Library: highlights snap to whole words; podcast is a full-width player bar
- passageOf widens a selection that starts or ends mid-word to the whole word (letters, digits, inner apostrophes and hyphens). "ur daily … kno" saves as "our daily … knowingly".
- Podcast moved out of the article into a player bar pinned under the text column, spanning the space between the app sidebar and the Notes sidebar. Desktop: artwork and title left, skip/play and progress centred, Coming soon, speed and volume right. Phone: artwork, title, play, with a hairline progress track on top.
- Tested in headless Chrome: bar spans x 272–1066 at 1440 (between both sidebars), full width at 390, no horizontal scroll; word snapping verified.

## 6d12a14 — Library: pick a highlight colour for each note; Add note pill appears beside the pointer
- Migration 0020_topic_note_color: topic_note.color (text, default 'yellow'). Applied locally only; apply remotely before deploying.
- Colours in src/lib/note-colors.ts: yellow, green, blue, pink, purple. POST /api/notes takes color; PATCH /api/notes/<id> takes note and/or color (bad colour 400).
- Composer shows a swatch row; edit mode on a note card shows it too and recolours immediately. Quote bar uses the note's colour. The last colour saved is the default for the next note (localStorage nl-note-color).
- Painting: one CSS highlight pair per colour (nl-<colour>, nl-<colour>-on for the picked note or the draft).
- Add note pill: with mouse/pen it stays hidden while dragging and appears on release 8px right of and just above the pointer, moving with the text on scroll. Touch and keyboard selections keep it under the selection. Positions divide by .nl-content's CSS zoom (1.1 at 1440px), which also fixes the old offset at that width.
- Tested in headless Chrome with a throwaway user (removed): pill at release point at 1300 and 1440px, pick green → saved green, edit → purple saved and painted after reload. Real mouse drag-selection could not be simulated in headless Chrome, so pointer events were synthetic.
- Note: dev server served stale globals.css until the file was touched again.

## 751e710 — Library: Add note pill opens the note instead of jumping; highlights use the picked swatch colour
- Bug: the reader's capture-phase pointerdown listener hid the pill when it was pressed, so the click never landed and pointerup re-showed it at the new point. Presses on [data-add-note] are now ignored.
- Highlight CSS is generated in the reader from NOTE_COLORS (color-mix of the swatch: 35% plain, 60% picked/draft), removed from globals.css. One source for picker and highlight, and no stale-CSS risk.
- Tested in headless Chrome with a real mouse click on the pill (throwaway user, removed): composer opened, picked blue → draft painted nl-blue-on, saved as blue, painted nl-blue.

## c2d8187 — TimeTable: remove Plan my sessions
- Removed the Plan my sessions button (sidebar and phone row), its getting-started step, PlanPopover, the "plan" dialog mode and the plan action. Free time hint now "When you can study. It repeats every week."
- Left in place: /api/timetable/plan and the planner in src/lib (no longer called from the UI); sessions planned before stay on calendars.
- Checked: tsc, eslint. Not checked in the browser (TimeTable needs a paid plan).

## Notion sync 2026-10-29 (no commit)
- Local and production: courses 6, topics 15, published 1 (Historical Overview), bodies fetched 1, removed 0. Other topics have no body text in Notion, so they stay unpublished.
- Production state at that time: notes API live, but the reader is the first notes version (no nl-selectable), so text cannot be selected there until the next deploy.

## Deploy 2026-10-29 14:04 (by the user)
- Worker uploaded with ffffb32..c2d8187 (selectable text, sidebar tabs, player bar, word-snapped highlights, colours, Add note fix, Plan my sessions removed). Scanner container step failed again (Workers Paid needed).
- Verified live: topic page has nl-selectable, the sidebar and the player bar; /api/notes 401 signed out; remote topic_note has the color column; 0 notes saved so far.

## 05dab8c — Library: floating button opens Summary and Notes on smaller screens
- Below 1280px a 56px round button (notes icon, yellow-orange gradient, note count badge) floats 16px above the player bar at the bottom right and opens the sidebar drawer. Hidden while the drawer is open and on wide screens.
- Replaces the inline "Summary & Notes" pill by the read time; unused sidebar icon removed. Article gets extra bottom padding below xl so the button never covers the chapter buttons.
- Tested in headless Chrome at 390px: button above the bar, opens the drawer, hides while open, absent at 1440px, no horizontal scroll.

## Deploy 2026-10-29 14:17 (by the user)
- Worker uploaded with 05dab8c (floating Summary & Notes button). Scanner container step failed again (Workers Paid needed).

## 78e47bb — Library: Add note works on touch screens; Summary and Notes is a popup card on smaller screens
- Bug: on touch screens tapping the pill cleared the selection first, so the pill unmounted before its click and startNote found no selection. The pill now acts on pointerdown (click only for keyboard, detail 0), and the reader keeps the range the pill was shown for (picked ref).
- Below 1280px the sidebar is a card (rounded, shadow) popping up above the floating button: full width minus 12px on phones, 380px from sm. Sized to content, capped at min(520px, 62%) of the reading area; tabs inside. The floating button toggles it (icon becomes ×); Escape closes. Drawer and its keyframes removed; the sidebar's own close button removed.
- After Add note on narrow screens the passage scrolls to the top of the reading area, clear of the card.
- Tested in headless Chrome with touch emulation and real touch taps at 390px: pill tap opens the composer with the quote, tab switch, button closes and reopens the card.

## 076001f — Notion sync: keep everything inside callouts and quotes, heading 4s, and bold italics
- Cause: case briefs in topic pages are Notion callouts whose Facts / Held / Comments / Procedural History paragraphs are nested inside them. The converter kept only the callout's own line, and dropped heading_4 blocks entirely ("1. Where There Is No Ambiguity").
- markdown.ts: callout → "> [!callout] <icon> <title>" plus its child blocks, quoted; quotes keep their children too; heading_4 → "####"; toggleable headings keep their folded children.
- markdown.tsx: callouts render as a card (bold title, then the inner Markdown); quotes render inner Markdown so paragraphs stay apart; "***x***" renders bold italic instead of showing asterisks.
- tidy.ts: a bold line ending in ";" or "," is no longer made a subheading. TIDY_VERSION 3, so the next sync re-reads every page.
- Checked against the live Notion page: all 72 text blocks present after conversion (2 differ only by heading tidying). Local sync: fetched 15, 8 case cards on Historical Overview, Attah case complete with Comments, Held, Procedural History, Facts in Notion's order.
- Notion state: CASE BRIEFS database has 1 row with no title or body; Articles, Podcast, Mock Questions, Pre-Bar, Bar and Level 200-400 sections are empty; 14 of 15 topics have no blocks.
- To ship: deploy, then run the production sync.

## 0a49ba3 — Notion: heading 1 is a chapter, heading 2 a sub-chapter
- markdown.ts: heading_1 → "##" (chapter), heading_2 → "###" (sub-chapter), heading_3 → "####", heading_4 → "#####". Renderer and tidy accept five levels; TIDY_VERSION 4.
- Reader shows a chapter's own title even when the topic has one chapter (it was hidden unless there were several), and sub-chapters nest under it.
- Historical Overview now: chapter "Nature and Essence of Contract" with sub-chapters "The Concept of Contract Law" and "Elements of a Contract", then Objective Test and the two numbered headings below. Was 2 chapters before.
- Local sync re-read 15 pages. Production needs deploy, then sync.

## 3c0bbe9 — Library: chapter and page menu at the top, pagination at the foot
- Topics read a page at a time: splitPages (markdown.tsx) splits each chapter (Notion heading 1) at its sub-chapters (heading 2); each sub-chapter is a page, text before the first one is a page under the chapter's name. A note's chapter field now holds its page index (production had 0 notes, so nothing to move).
- Top bar (sticky, translucent, hairline): a menu pill with the current page (Ch. n when there are several chapters) opening a menu of chapters with their pages, current page ticked; a ‹ n / N › stepper; a blue progress hairline. Hidden for single-page topics. Closes on outside tap, Escape or a pick.
- Foot: Previous / Next cards with page titles, "Finished · Back to course" after the last page, Apple page dots (Page n of N text above 15 pages). Left/right arrow keys turn pages (not with modifiers or in fields).
- Page header: chapter name above the sub-chapter title; meta line shows chapters, pages and reading time. Chapter chips removed. Notes panel groups by page.
- Mobile: 56px bar, 40px pill and stepper buttons, full-width menu with 44px rows.
- Tested in headless Chrome at 1300 and 390px: menu lists chapter and both pages, picking, stepper, arrow key, dots, no horizontal scroll.

## Deploy + production sync 2026-10-29 14:47
- Deployed by the user with 076001f, 0a49ba3, 3c0bbe9 (scanner step failed again). Production sync: fetched 15, published 1. Live page has the page menu, the Attah case with Procedural History, chapter "Nature and Essence of Contract" with its two pages.

## 4740f8c — Library: each sub-chapter paginates at its heading 3s
- splitPages (markdown.tsx): a sub-chapter ("###", Notion heading 2) splits again at each section ("####", heading 3); each section is its own page. Text before the first section stays the sub-chapter's page; a sub-chapter with no text of its own gives no empty page. Page gains `parent` (the sub-chapter, or the chapter for sections before any sub-chapter).
- Reader: page header reads "Chapter · Sub-chapter" above a section's title. Chapter menu nests sections under their sub-chapter (deeper indent, 13px); a sub-chapter without its own page shows as a row opening its first section.
- Historical Overview: 2 pages → 3 (The Concept of Contract Law, Elements of a Contract, Objective Test). Heading 4s stay inside their page.
- Page numbers shift: notes saved since 3c0bbe9 on a later page would now show against a different page.
- Typecheck and lint clean; split checked against the synced topic. Not checked in the browser (page needs sign-in).

## 08da47e — Library: pages of equal length; each chapter starts a new page
- splitPages (markdown.tsx) now paginates like a book: each chapter (Notion heading 1) starts a new page; its text flows across pages of about equal length (PAGE_CHARS 3000, ~450 words). Page count per chapter = round(length / 3000); each block goes on the page its middle falls in, so pages are as even as whole blocks allow. Only the chapter's last page runs short.
- Breaks fall between blocks (blank-line runs; code fences kept whole), so a paragraph, list, quote or case card is never cut. A heading left at the foot of a page moves to the next.
- Page type: title (sub-chapter/section the page opens in), cont (opens mid-section), heads (heading 2/3 that start on it). Replaces 4740f8c's heading-per-page split and parent field.
- Reader: chapter's first page shows "Chapter n" and the chapter title; later pages show "Chapter · title › section (continued)" and the text carries on, its own headings inline.
- Menu: chapter row, then every sub-chapter (indent 1) and section (indent 2) with the page it starts on at the right; the one the reader is in is ticked.
- Historical Overview: 3 → 8 pages (3129, 3397, 2027, 3431, 2713, 3395, 2218, 3635 chars). Big case cards are why it is not closer.
- Page numbers shift again for any saved notes.
- Typecheck and lint clean. Not checked in the browser (page needs sign-in).

## Deploy 2026-10-29 15:00
- Pushed 4740f8c, 08da47e to main. Worker version 536d465a live (notifiedlaw.com 200). Scanner container step failed again (containers API, Workers Paid needed). No sync needed: pagination is render-side only.

## fb64360 — Notes: the whole card opens its passage; Case Law reads "Case Briefs on Cases"
- NoteCard (notes.tsx): a click anywhere on the card (quote, note text, date) opens the page and highlights the passage, as the quote alone did. Edit, delete, keep buttons and the editor are left alone; nothing happens while editing or confirming a delete. Pointer cursor and a soft hover shadow in view mode. The quote button stays for keyboard users.
- Case Law subtitle: page title (case-law.tsx) and the top bar (nav.ts) now say "Case Briefs on Cases" (were "Case briefs on Ghanaian cases" and "Case briefs").
- Typecheck and lint clean. Not checked in the browser (needs sign-in).

## 934b2d3 — Case Law: Notion's case brief columns, each select column filterable by its Notion options
- Sync (sync.ts): for each section database (Case Briefs, Articles, Podcast, Mock Questions) it now reads the database itself and stores a cms_entry row of kind "columns" (id = database id, slug = the section's kind) with each column's name, type and, for select/multi-select/status columns, Notion's options in order. Not counted as published content. No migration (kind is free text; schema.ts comment updated).
- cms.ts: getColumns(kind) returns those columns; CmsCase gains cells (every Notion column by name, as a list); court is now every Court value joined, not just the first.
- Case Law page: table on wide screens (lg+) with Notion's columns in the table view's order: Case Name, Course, Court, Citation, Jurisdiction (the API lists them Court, Citation, Course, Jurisdiction, so ORDER fixes it; new Notion columns follow). Course, Court and Jurisdiction headers open a checklist of every Notion option (Course: Ghana Legal System, Constitutional Law, Contract Law; Court: Supreme Court, Court of Appeal, Circuit Court, District Court; Jurisdiction: Rwanda, South Africa, US, UK, Nigeria, Ghana) with a case count each, plus All. Picks in one column are OR, across columns AND; header shows a blue count; "Clear filters" by the case count.
- Phones/tablets: the same filters as pills above the list (pill reads "Jurisdiction · Ghana"); list rows show every column. Dropdown opens leftwards near the right edge.
- Option names relabelled from Notion capitals ("COURT OF APPEAL" → "Court of Appeal", UK/US kept); citations shown as written. Search covers case name and every column.
- Before a sync has read the columns, filters fall back to the values the rows hold.
- Tested locally: sync stored the columns; with 3 sample cases (removed after) the Court filter on desktop and Jurisdiction on 390px filtered correctly, no horizontal scroll. Notion's CASE BRIEFS has one row with no name, so the live page stays empty until briefs are written.
- To ship: deploy, then run the production sync.

## 49c10db — Case Law: keep the table and its filters when no briefs are published
- The "No case briefs yet" card replaced the whole page. Now the search, sort, column headers and Course/Court/Jurisdiction filters (with Notion's options, counts 0) always show; the table (and the phone list) holds one row: "No case briefs yet. They appear here once they are published."
- Checked locally at 1400 and 390px with no cases; no horizontal scroll.

## Deploy + production sync 2026-10-29 15:13
- Pushed 934b2d3, 49c10db. Worker version cca81c18 live; scanner container step failed again (Workers Paid needed).
- Production sync: 6 courses, 25 topics (10 new or changed bodies fetched), 32 entries, 1 published. Columns row for case stored in remote D1; notifiedlaw.com/case-law shows the headers and filters with no briefs.
- 0eeeb6b TimeTable: popover focus rings no longer clipped at the scroll edges (course name input on desktop)
- f71c592 Hot Topics: mock podcast UI (sample Accra episodes, simulated player, chapters, links to cases/Acts/articles/topics, area filter); Notion write-ups listed below
- 56ee256 Flashcards: mock UI (due-today card, decks with mastery, full-screen review: tap to flip, swipe/buttons to grade, missed cards repeat, keyboard shortcuts)
- 5ecb45c Articles: Google preferred source button (publisher.js in manual mode, deeplink fallback) on the list and each article

## Production sync 2026-10-30
- Ran POST /api/admin/sync on notifiedlaw.com: 6 courses, 25 topics, 35 entries, 4 published, 5 bodies fetched, 0 removed.

## 70a5ea6 — My Files: upload progress, coded errors, unique folder names

- Uploads go through XMLHttpRequest (fetch cannot report upload progress). A status card shows the file name, "File N of M" for batches, and percent sent; once all bytes are sent it switches to "Checking … Scanning…" with a pulsing full bar. The Upload button shows the percent too.
- Every failure on the page now reads "An error has occurred please try again later. Error code: XXXX". No reason is shown, including browser-side pre-checks (N002–N004) and network failures (N001). Responses without a code show H<status> (H429 from the shared rate limiter).
- New `src/lib/error-codes.ts`: server-only table of codes → internal meanings (A auth, U upload, M file rename/move/delete, D folders) plus `apiError(code, status)`. File and folder APIs now answer `{ code }` only. Content-check failures return U104/U105/U106 by file type and log the detailed reason with `console.warn` in the Worker log.
- Folder names are unique per parent folder, ignoring case. `nameTaken` checks first; `addFolder` (INSERT … WHERE NOT EXISTS) and `moveFolder` (UPDATE … WHERE NOT EXISTS) enforce it in one statement, so simultaneous requests cannot both succeed. Conflicts return D306. Applies to create, rename and move.
- Double-create fix: a `creating` ref drops a second submit while the first is in flight (Enter plus a click on Create). The new-folder and folder-rename forms show "A folder with this name is already here." and disable the submit button for a clash.

## 8f6eb71 — Reader: text wraps to the screen, tidier type, plain Previous and Next buttons
- Root cause of sideways scrolling: Notion content uses no-break spaces (U+00A0) between words, so paragraphs and list items could not wrap. `tidy()` in `src/components/markdown.tsx` turns U+00A0, U+2007 and U+202F into plain spaces in `Markdown` and `splitChapters` (affects library, articles, case law, hot topics, exam prep). Note anchoring is unaffected: `textMap` already folds all whitespace to one space.
- Reader scroller is `overflow-y-auto overflow-x-hidden`; the article breaks long words and links (`break-words`).
- Tables no longer scroll sideways: rounded hairline card, shaded header row, 14px text, cells wrap anywhere. Code blocks wrap (`pre-wrap`).
- Callout cards: first and last child sit flush with the padding (removes the gap above a card's heading); slightly smaller text and padding on phones.
- Type a step smaller: body 17px on phones / 18px from md, column 680px; topic title 26/34px, chapter 22/26px; Markdown headings 26/23/20/17/16px.
- Page foot: just "Previous" and "Next" pill buttons (Next filled blue), "Back to course" on the last page; page names moved to aria-labels. Page dots kept.

## 96b934c — SEO audit fixes
- Audit found most SEO already in place: robots.ts, dynamic sitemap, canonicals, JSON-LD (Organization, WebSite, Article, Course, BreadcrumbList), OG/Twitter, one h1 per page, www redirect.
- Added HSTS (2 years, preload), Permissions-Policy and COOP headers in `next.config.ts`.
- `/timetable` added to `PRIVATE_PATHS` (robots + X-Robots-Tag noindex).
- Topic pages: `generateMetadata` with canonical and OG; locked topics are noindex. Open preview topics added to the sitemap.
- Landing: `exam` and `hero-poster` converted JPG to WebP (707 KB to 92 KB for exam), explicit width/height on both.
- Manual: Cloudflare dashboard, SSL/TLS, Edge Certificates, turn on Always Use HTTPS; submit sitemap in Search Console.

## 5e6bdf4 — TimeTable mobile fit and write throttle
- Week view on phones: no `min-w-[760px]`; 36px hour column, day initial stacked over number, whole week fits the width. Hours still scroll (max 72dvh).
- New `RL_TIMETABLE` binding (12 per 10s, per user). In `src/lib/rate-limit.ts`, tripping it blocks that user's TimeTable writes for 5 minutes (per isolate, best effort). Applied to every TimeTable write route, ahead of `WRITES`.
- `MAX_DAY_SESSIONS` = 24 for sessions added or moved by hand; planner exempt.
- Needs deploy for the new binding. Not visually checked at phone width (dev page refuses iframing, window would not resize).

## e98cdec — Reader Summary/Notes dock and bottom sheet
- `Fab` replaced by `Dock`: frosted capsule (Summary | Notes + count), centred above the player bar, safe-area aware. Hides on scroll down, returns on scroll up, near the top or at the page end.
- `Popup` replaced by `Sheet`: grabber, two heights (medium ~52% / max 480px, large full minus 12px with dim backdrop). Grabber tap toggles height; drag up expands, drag down shrinks or closes. Close button in the tab header (sheet only). Floating card at bottom right from `sm` up.
- `motion-safe:` on all animations. `navigator.vibrate(8)` on note save (no effect on iOS Safari).
- Checked in Chrome at 606px wide: dock, medium sheet, tap to large, drag to close, hide on scroll.

## ce95aa4 — Topic completion tracker
- New table `topic_progress` (user_id, topic_id, completed_at; PK both ids), migration `0021_topic_progress.sql`. Applied locally only; run remotely before deploy.
- `src/lib/progress.ts` (completedTopics, myCompleted, setCompleted) and `/api/progress` (GET list, PUT { topicId, done }; WRITES limit; `noteBlock` check so only live topics open on the plan can be marked).
- `TopicInfo` now carries the topic's Notion `id`.
- `src/components/progress.tsx`: `useProgress` (optimistic, reverts with an error), `CheckCircle`, `ProgressBar`.
- Library: round check per topic row, progress ring + "x/y" per course. Course page: progress bar, Up next / Start link, All / To study / Studied filter. Reader: "Mark as studied" card at end of last page, "· Studied" in the meta line.
- Guests see no checks. Verified in Chrome: toggle in list, persists on reload, ring, reader card on and off.

## 92189be — Note input on phones
- `NoteField` textarea 16px below `md` (iOS zooms on focus under 16px); 14px from `md` up. Save/Cancel h-10 on phones.
- No autofocus on `(pointer: coarse)`: programmatic focus outside a tap selects without a keyboard on iOS. Desktop still autofocuses.
- `Sheet`: focusing a textarea switches to the large detent; `visualViewport` resize/scroll lifts the sheet above the keyboard (`bottom` + reduced height). Field scrolls into view 350ms after focus.
- Desktop edit checked in Chrome (autofocus, 14px). Phone behaviour not testable here: needs a real iPhone.

## 0739a2b — Justified learning material
- `src/components/markdown.tsx`: `JUSTIFY = "text-justify hyphens-auto"` on body `<p>` and `<li>`. Blockquotes and callouts inherit through their nested Markdown. Headings, callout titles, tables, code left as they were.
- Covers library reader, Exam Prep, Hot Topics, case law, articles. Hyphenation relies on `<html lang="en-GH">`. Checked in the reader in Chrome.

- Article reader: Apple-style header (eyebrow, title, summary, author byline), serif body with SF headings, optional Author column from Notion.
- Articles: optional Image column (URL or site path). Hero image on the reader, square thumbnail on the left of each list row. Cover for the defamation article is `public/articles/free-speech-dignity-defamation-cases.webp` (1280px, q82, 110 KB).
- Articles list: replaced rows with a featured card (cover on top, big title, Read link) plus a card grid (1/2/3 columns). Cover-less articles get a soft gradient with the title initial. Featured shows only with no search or industry filter.
