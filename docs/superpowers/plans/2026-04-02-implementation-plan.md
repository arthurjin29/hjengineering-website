# HJ Engineering Website — Implementation Plan

**Date:** 2026-04-02
**Spec:** `docs/superpowers/specs/2026-04-02-website-rebuild-design.md`
**Style source of truth:** `.superpowers/brainstorm/270-1775009481/content/homepage-layout-v2.html`
**Stitch reference:** `projects/16027916701559145650` (layout/structure reference only — colours/fonts from original mockup)

---

## Phases Overview

| Phase | Name | Scope | Est. Files |
|-------|------|-------|------------|
| 1 | **Scaffold + Design Tokens** | SvelteKit project, Tailwind config, fonts, global CSS, app.html | ~10 |
| 2 | **Layout Shell** | Nav, Footer, root layout, error page, SeoMeta component | ~8 |
| 3 | **Marketing Pages** | Homepage, Services (index + 4 sub-pages), About, Contact, Resources | ~12 |
| 4 | **Blog Engine** | mdsvex setup, blog index, blog post template, sitemap, RSS | ~8 |
| 5 | **Auth + Admin** | Auth.js, Google OAuth, Vercel KV whitelist, admin route | ~6 |
| 6 | **Tools — Sling Calculator** | Port from D:\sling-length-calculator, 6 configs, client-side | ~10 |
| 7 | **Tools — Access Map** | Leaflet UI, API proxy, auth-gated route, FastAPI integration | ~6 |
| 8 | **Security + Performance** | CSP headers, rate limiting, image optimization, Lighthouse audit | ~4 |
| 9 | **Deploy + DNS** | Vercel setup, env vars, preview deploy, DNS cutover | ~2 |

---

## Phase 1: Scaffold + Design Tokens

**Goal:** Empty SvelteKit project that builds and deploys, with all design tokens configured.

### Steps

1.0. **Preserve existing files** — Back up `docs/` and `.superpowers/` before scaffolding. After `sv create`, restore them into the new project structure. The repo already has 4 commits — scaffold must not clobber existing work.

1.1. **Create SvelteKit project**
```bash
cd "D:\HJ Engineering\hjengineering-website"
# Move existing dirs out temporarily
mv docs docs_bak && mv .superpowers .superpowers_bak
npx sv create . --template minimal --types ts --force
# Restore
mv docs_bak docs && mv .superpowers_bak .superpowers
```
Select: Tailwind CSS 4, ESLint, Prettier

1.2. **Install dependencies**
```bash
npm install @sveltejs/adapter-vercel @auth/sveltekit @vercel/kv resend
npm install -D mdsvex @fontsource/inter @fontsource/jetbrains-mono
```

1.3. **Configure `svelte.config.js`**
- adapter-vercel
- mdsvex preprocessor for `.md` files in `src/content/blog/`
- Alias `$content` → `src/content`

1.4. **Configure Tailwind CSS 4** (`src/app.css`)

Tailwind 4 uses **CSS-based configuration** (not `tailwind.config.js`). Define design tokens via `@theme`:
```css
@import "tailwindcss";
@import "@fontsource/inter/latin-400.css";
@import "@fontsource/inter/latin-500.css";
@import "@fontsource/inter/latin-600.css";
@import "@fontsource/inter/latin-700.css";
@import "@fontsource/jetbrains-mono/latin-400.css";

@theme {
  --color-bg-dark: #0f172a;
  --color-bg-card-dark: #1e293b;
  --color-bg-light: #ffffff;
  --color-bg-subtle: #f1f5f9;
  --color-primary: #06b6d4;
  --color-primary-text: #0891b2;
  --color-primary-hover: #0e7490;
  --color-text-dark: #0f172a;
  --color-text-body: #475569;
  --color-text-muted: #64748b;
  --color-text-light: #f1f5f9;
  --color-border: #e2e8f0;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

No `tailwind.config.js` needed — Tailwind 4 reads `@theme` from CSS directly.

1.5. **Fonts via @fontsource**

Using `@fontsource` packages (installed in 1.2) — they bundle subsetted woff2 files. Imported in `app.css` (step 1.4). Add `font-display: swap` override and `<link rel="preload">` for Inter Regular + Bold in `src/app.html`.

No manual file copying needed — `@fontsource` handles subsetting and file paths.

1.6. **Create `src/app.html`**
- HTML `lang="en-AU"`
- Preload font links for Inter 400 + 700 woff2
- Vercel Analytics script placeholder (async)

1.7. **Create `.env.example`**
```
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=
ACCESS_MAP_API_URL=
ACCESS_MAP_INTERNAL_SECRET=
RESEND_API_KEY=
```

1.8. **Update `.gitignore`** — add `.env`, `node_modules`, `.svelte-kit`, `.vercel`

1.9. **Favicon** — Create or source a simple HJ Engineering favicon (cyan "HJ" monogram on transparent). Place at `static/favicon.ico` + `static/favicon.svg`.

1.10. **Local dev note:** `@vercel/kv` requires a Vercel KV store. For local development, either use `vercel dev` (connects to preview KV store) or create a mock at `src/lib/server/kv-mock.ts` that uses an in-memory `Map`. The mock is swapped out when deploying to Vercel.

1.11. **Verify:** `npm run dev` starts, `npm run build` succeeds, Tailwind classes apply with correct colours.

### Deliverables
- [ ] SvelteKit builds clean
- [ ] Tailwind 4 `@theme` tokens match spec hex values exactly
- [ ] Fonts load via `@fontsource` with `font-display: swap`
- [ ] `.env.example` committed (no secrets)
- [ ] Existing `docs/` and `.superpowers/` preserved
- [ ] Favicon in place

---

## Phase 2: Layout Shell

**Goal:** Global nav + footer rendered on all pages, auth session available, error page branded.

### Steps

2.1. **`src/lib/auth.ts`** — Auth.js config (Google provider, JWT session, 1hr expiry). No whitelist logic yet — just the provider setup.

2.2. **`src/routes/+layout.server.ts`** — Load Auth.js session via `event.locals.auth()`. Return `{ session }` to all pages.

2.3. **`src/routes/+layout.svelte`** — Render `<Nav>`, `<slot />`, `<Footer>`. Pass session to Nav.

2.4. **`src/lib/components/Nav.svelte`**
- White bg, fixed top, border-bottom `#e2e8f0`
- Left: "HJ Engineering" in `#0891b2` bold 18px, links to `/`
- Right: Services, Tools (dropdown), Resources, About, Blog — `#475569` 13px
- "Contact" CTA button: `#0891b2` bg, white text, rounded
- Tools dropdown: Sling Calculator + Access Map (lock icon)
- Mobile: hamburger → full-screen overlay
- ARIA: `aria-expanded`, `aria-controls` on hamburger + dropdown

2.5. **`src/lib/components/Footer.svelte`**
- `#020617` bg
- Left: "© 2026 HJ Engineering Consultants. All rights reserved." `#64748b` 12px
- Right: LinkedIn + GitHub links `#64748b`

2.6. **`src/lib/components/SeoMeta.svelte`**
- Props: `title`, `description`, `ogImage`, `ogUrl`, `type`
- Renders `<svelte:head>` with `<title>`, meta description, OG tags, Twitter card

2.7. **`src/routes/+error.svelte`**
- Shows error code + friendly message
- "Go back to homepage" button
- Uses Nav + Footer (via layout)

2.8. **`src/hooks.server.ts`**
- Auth.js `handle` hook
- CSP headers (report-only mode initially)

### Deliverables
- [ ] Nav renders on all routes with correct colours
- [ ] Mobile hamburger works with proper ARIA
- [ ] Tools dropdown shows both tools
- [ ] Footer on all pages
- [ ] SeoMeta sets `<title>` per page
- [ ] 404 page shows branded error

---

## Phase 3: Marketing Pages

**Goal:** All static content pages implemented with real layout from mockup.

### Steps

3.1. **Homepage (`src/routes/+page.svelte`)**

Match `.superpowers/brainstorm/270-1775009481/content/homepage-layout-v2.html` exactly:
- Hero: `bg-gradient-to-b from-[#0f172a] to-[#1e293b]` + blueprint grid overlay (CSS repeating-linear-gradient, 4% opacity cyan)
- Credentials bar: `bg-[#0891b2]` full-width, white text
- Services grid: 2×2 `grid-cols-2` on desktop, `grid-cols-1` on mobile. Cards: `bg-[#f8fafc]` + `border-l-[3px] border-[#0891b2]`
- Tools section: `bg-[#f1f5f9]`, 2-col cards with `border border-[#e2e8f0]`
- CTA: `bg-[#0f172a]`
- JSON-LD: `Organization` + `ProfessionalService`

3.2. **`src/lib/data/services.ts`** — Service content array:
```ts
export const services = [
  { slug: 'lifting-crane-planning', name: 'Lifting & Crane Planning', ... },
  { slug: 'temporary-works', ... },
  { slug: 'ground-bogmat-assessment', ... },
  { slug: 'risk-safety-engineering', ... },
]
```

3.3. **Services index (`src/routes/services/+page.svelte`)** — Vertical layout, 4 sections with deliverables lists + standards footnotes.

3.4. **Service detail (`src/routes/services/[slug]/+page.svelte` + `+page.ts`)** — Load from `services.ts` by slug. Hero banner, description, deliverables, standards, CTA.

3.5. **About (`src/routes/about/+page.svelte`)** — Two-column bio section, "Our Approach" section, credentials grid. Placeholder text (Arthur to review).

3.6. **Contact (`src/routes/contact/+page.svelte` + `+page.server.ts`)**
- Form: name, email, phone (optional), company, message + honeypot
- Form action: validate server-side, send via Resend (or `console.log` during dev if no API key)
- **Rate limiting deferred** — `rate-limit.ts` is created in Phase 5 (uses Vercel KV). Wire into this form action after Phase 5 completes.
- Success/error states via `form` prop (progressive enhancement — works without JS)
- Contact details card: email, phone, ABN, PE number

3.7. **Resources (`src/routes/resources/+page.svelte`)** — "Coming soon" placeholder grid. Static file list from `src/lib/data/resources.ts`.

3.8. **Portfolio (`src/routes/portfolio/+page.svelte`)** — Minimal placeholder. Route exists but not in nav.

### Deliverables
- [ ] Homepage matches approved v2 mockup pixel-for-pixel
- [ ] All 4 service sub-pages render
- [ ] Contact form submits and validates
- [ ] About page has placeholder content
- [ ] Resources shows "Coming soon"
- [ ] All pages have SeoMeta + breadcrumb JSON-LD

---

## Phase 4: Blog Engine

**Goal:** mdsvex blog with index page, post template, sitemap, RSS.

### Steps

4.1. **mdsvex config** in `svelte.config.js` — process `.md` files, syntax highlighting (Shiki), layout component for posts.

4.2. **Blog layout** (`src/routes/blog/[slug]/+page.svelte`) — Title, date, read time, rendered markdown content, author byline.

4.3. **Blog index** (`src/routes/blog/+page.svelte` + `+page.server.ts`) — Use `import.meta.glob` in server load to list posts from `src/content/blog/`, sorted by date. Title, excerpt, date, read time.

4.4. **Sample post** (`src/content/blog/hello-world.md`) — Frontmatter: title, date, description. Body: intro to HJ Engineering's blog.

4.5. **Sitemap** (`src/routes/sitemap.xml/+server.ts`) — Generate XML from known routes + blog slugs.

4.6. **RSS feed** (`src/routes/rss.xml/+server.ts`) — Atom feed of blog posts.

4.7. **`static/robots.txt`**
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /auth/
Sitemap: https://hjengineering.com.au/sitemap.xml
```

### Deliverables
- [ ] Blog index lists posts
- [ ] Blog post renders markdown with syntax highlighting
- [ ] Sitemap.xml returns valid XML
- [ ] RSS feed validates
- [ ] robots.txt in place

---

## Phase 5: Auth + Admin

**Goal:** Google OAuth working, whitelist enforcement, admin CRUD.

### Steps

5.1. **Auth.js setup** (`src/lib/auth.ts`) — Google provider, JWT strategy, 1hr maxAge. `signIn` callback checks email against Vercel KV whitelist — denies session if not listed.

5.2. **Auth catch-all** (`src/routes/auth/[...auth]/+server.ts`) — Auth.js route handler.

5.3. **Whitelist module** (`src/lib/server/whitelist.ts`) — `isWhitelisted(email)`, `addToWhitelist(email)`, `removeFromWhitelist(email)`, `getWhitelist()`, `isAdmin(email)`. All use `@vercel/kv`.

5.3a. **Rate limiting module** (`src/lib/server/rate-limit.ts`) — IP-based counter via `@vercel/kv` with TTL. Created here alongside whitelist since both use KV. Retrofit into contact form action (Phase 3) after this phase completes.

5.4. **Admin whitelist page** (`src/routes/admin/whitelist/+page.server.ts` + `+page.svelte`)
- `+page.server.ts`: verify session, verify admin, load whitelist, handle add/remove form actions
- `+page.svelte`: table of emails, add form, remove buttons

5.5. **Seed initial data** — Arthur's email in both `admins` and `whitelist` sets in Vercel KV.

5.6. **Test auth flow end-to-end:**
- Non-whitelisted: denied, redirect with `?denied=true`
- Whitelisted: session created, access granted
- Admin: can view/modify whitelist

### Deliverables
- [ ] Google OAuth sign-in works
- [ ] Non-whitelisted users see "Access pending" message
- [ ] Whitelisted users get session
- [ ] Admin can add/remove emails
- [ ] 1hr session expiry works

---

## Phase 6: Tools — Sling Calculator

**Goal:** Port existing sling-length-calculator to Svelte 5 client-side component.

### Steps

6.0. **Audit existing calculator** (`D:\sling-length-calculator`)
- Inventory all calculation modules, config types, and edge cases
- Note: cascading config physics was fixed (2026-03-22), stinger angle damped solver added (2026-03-26), 5 files still uncommitted
- Identify diagram renderers (SVG/Canvas) per configuration
- **Decision point:** exact port (same UI in Svelte) vs. redesigned UI for website context. Recommend exact port first, then iterate.

6.1. **Copy calculation engine** → `src/lib/sling-calc/`
- Port JavaScript calculation modules to TypeScript
- All 6 rigging configurations including cascading physics + damped stinger solver
- Zero server dependencies — pure client-side
- Preserve all numerical edge cases (the solver was carefully tuned — don't refactor the math)

6.2. **Calculator page** (`src/routes/tools/sling-calculator/+page.svelte`)
- Configuration selector (tabs or radio buttons)
- Input fields for each config's parameters
- Real-time calculation results
- Diagram/visualization per config (port existing SVG renderers)
- `aria-live="polite"` region for results

6.3. **Dynamic import** — Calculator engine loaded via `import()` so it doesn't bloat the main bundle.

6.4. **Input validation** — Numeric range checks, prevent NaN/Infinity.

6.5. **Verification** — Run side-by-side with existing calculator on known inputs. All 6 configs must produce identical results.

### Deliverables
- [ ] All 6 configs calculate correctly
- [ ] Results match existing calculator output
- [ ] Works offline (pure client-side)
- [ ] Accessible (labels, aria-live)

---

## Phase 7: Tools — Access Map

**Goal:** Leaflet map UI behind auth, proxied to FastAPI backend.

### Steps

7.1. **Landing page** (`src/routes/tools/access-map/+page.svelte`)
- Unauthenticated: tool description + "Sign in with Google" button
- `?denied=true`: "Access pending — contact HJ Engineering" message
- Authenticated: full Leaflet map UI

7.2. **Server-side auth check** (`src/routes/tools/access-map/+page.server.ts`)
- Load session, check whitelist
- If not authed/whitelisted: return `{ authorized: false }`
- If authed: return `{ authorized: true }`

7.3. **API proxy** (`src/routes/api/access-map/[...path]/+server.ts`)
- Verify Auth.js session
- Re-check whitelist (defense-in-depth)
- Forward to `ACCESS_MAP_API_URL` with `X-Internal-Auth` header
- Return FastAPI response

7.4. **Leaflet integration** — Dynamic import Leaflet + plugins. Connect to proxy API for permit data.

7.5. **Test:** Auth flow → map loads → permit data renders via proxy.

### Deliverables
- [ ] Unauthenticated users see landing page
- [ ] Denied users see "Access pending"
- [ ] Authorized users see working map
- [ ] API proxy forwards correctly with auth header
- [ ] No direct browser → FastAPI requests

---

## Phase 8: Security + Performance

**Goal:** Harden for production.

### Steps

8.1. **CSP headers** — Switch from report-only to enforcing in `hooks.server.ts`. Test all pages work (OAuth, Sentry, Analytics, Leaflet tiles).

8.2. **Wire rate limiting** — `rate-limit.ts` was created in Phase 5. Verify it's applied to the contact form action (Phase 3.6) and test with Vercel KV on preview deployment.

8.3. **Image optimization** — `vite-imagetools` config. Convert any static images to WebP. Add `loading="lazy"` to below-fold images.

8.4. **Lighthouse audit** — Run on all key pages. Target: 90+ Performance, 100 Accessibility, 90+ SEO, 90+ Best Practices.

8.5. **Sentry setup** — Install `@sentry/sveltekit`, configure in hooks.

### Deliverables
- [ ] CSP enforcing, no violations
- [ ] Contact form rate-limited
- [ ] Lighthouse scores meet targets
- [ ] Sentry capturing errors

---

## Phase 9: Deploy + DNS

**Goal:** Production live at hjengineering.com.au.

### Steps

9.1. **Vercel project setup** — Link repo, set env vars, configure adapter.

9.2. **Preview deploy** — Test all features on preview URL.

9.3. **Google OAuth** — Create GCP project, OAuth 2.0 credentials. Set redirect URI to production domain.

9.4. **Vercel KV setup** — Create KV store, seed admin email.

9.5. **DNS cutover**
- Lower TTL to 300s 24-48 hours before
- Point `hjengineering.com.au` to Vercel (CNAME or nameservers)
- Verify SSL certificate

9.6. **Post-launch checklist:**
- [ ] All pages load on production domain
- [ ] Google OAuth works with production redirect URI
- [ ] Access Map proxy works
- [ ] Sitemap submitted to Google Search Console
- [ ] Sentry receiving events
- [ ] Analytics tracking

---

## Dependencies Between Phases

```
Phase 1 (Scaffold) → Phase 2 (Layout) → Phase 3 (Marketing Pages)
                                       → Phase 4 (Blog)
                                       → Phase 5 (Auth) → Phase 7 (Access Map)
                                       → Phase 6 (Sling Calc) [independent]
Phase 3-7 all done → Phase 8 (Security) → Phase 9 (Deploy)
```

- Phase 2 is the gate — everything after it needs the root layout, nav, footer, hooks, and auth.ts skeleton.
- Phases 3, 4, 5, and 6 can run in parallel after Phase 2.
- Phase 7 depends on Phase 5 (auth + whitelist must exist before gating access map).
- Phase 8 depends on all feature phases (can't audit what isn't built).
- Phase 6 (Sling Calc) has no auth dependency — fully independent after Phase 2.

---

## Content Blockers (Arthur's input needed)

These items can be filled with placeholder text during development and swapped later:

| Item | Needed for | Blocking? |
|------|-----------|-----------|
| About page bio | Phase 3 | No — placeholder OK |
| Service descriptions (detailed) | Phase 3 | No — can draft from spec |
| Phone number | Phase 3 (Contact) | No — can add later |
| LinkedIn/GitHub URLs | Phase 2 (Footer) | No — placeholder OK |
| First blog post | Phase 4 | No — sample post OK |
| Access map beta users (emails) | Phase 5 | No — seed Arthur only |
| Resources/checklists (PDFs) | Phase 3 | No — "Coming soon" OK |

**None of these block starting development.** All can be swapped in before DNS cutover.
