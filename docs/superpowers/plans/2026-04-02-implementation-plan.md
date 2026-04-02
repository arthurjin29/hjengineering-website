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

1.1. **Create SvelteKit project**
```bash
cd "D:\HJ Engineering\hjengineering-website"
npx sv create . --template minimal --types ts
```
Select: Tailwind CSS 4, ESLint, Prettier

1.2. **Install dependencies**
```bash
npm install @sveltejs/adapter-vercel @auth/sveltekit @vercel/kv
npm install -D mdsvex @fontsource/inter @fontsource/jetbrains-mono
```

1.3. **Configure `svelte.config.js`**
- adapter-vercel
- mdsvex preprocessor for `.md` files in `src/content/blog/`
- Alias `$content` → `src/content`

1.4. **Configure Tailwind CSS** (`app.css` or `tailwind.config.js`)
- Extend theme with design tokens from spec §4.1:
  ```
  --bg-dark: #0f172a       --primary: #06b6d4
  --bg-card-dark: #1e293b  --primary-text: #0891b2
  --bg-light: #ffffff      --primary-hover: #0e7490
  --bg-subtle: #f1f5f9     --text-dark: #0f172a
  --border: #e2e8f0        --text-body: #475569
                            --text-muted: #64748b
                            --text-light: #f1f5f9
  ```

1.5. **Self-host fonts**
- Copy Inter (400, 500, 600, 700) and JetBrains Mono (400) woff2 files to `static/fonts/`
- `@font-face` declarations in `app.css` with `font-display: swap`
- `<link rel="preload">` for Inter Regular + Bold in `src/app.html`
- Subset to Latin + Latin Extended

1.6. **Create `src/app.html`**
- HTML lang="en-AU"
- Preload font links
- Vercel Analytics script placeholder (async)

1.7. **Create `.env.example`**
```
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=
ACCESS_MAP_API_URL=
ACCESS_MAP_INTERNAL_SECRET=
```

1.8. **Update `.gitignore`** — add `.env`, `node_modules`, `.svelte-kit`, `.vercel`

1.9. **Verify:** `npm run dev` starts, `npm run build` succeeds, deploy preview works.

### Deliverables
- [ ] SvelteKit builds clean
- [ ] Tailwind tokens match spec hex values
- [ ] Fonts load with `font-display: swap`
- [ ] `.env.example` committed (no secrets)

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
- Form action: validate server-side, rate limit, send via Resend (or log for now)
- Success/error states via `form` prop (progressive enhancement)
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

4.3. **Blog index** (`src/routes/blog/+page.svelte` + `+page.ts`) — List posts from `src/content/blog/`, sorted by date. Title, excerpt, date, read time.

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

6.1. **Copy calculation engine** from `D:\sling-length-calculator` → `src/lib/sling-calc/`
- Port JavaScript calculation modules to TypeScript
- All 6 rigging configurations
- Zero server dependencies — pure client-side

6.2. **Calculator page** (`src/routes/tools/sling-calculator/+page.svelte`)
- Configuration selector (tabs or radio buttons)
- Input fields for each config's parameters
- Real-time calculation results
- Diagram/visualization per config
- `aria-live="polite"` region for results

6.3. **Dynamic import** — Calculator engine loaded via `import()` so it doesn't bloat the main bundle.

6.4. **Input validation** — Numeric range checks, prevent NaN/Infinity.

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

8.2. **Rate limiting** (`src/lib/server/rate-limit.ts`) — IP-based counter via Vercel KV. Apply to contact form action.

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

Phases 3, 4, and 6 can run in parallel after Phase 2.
Phase 7 depends on Phase 5 (auth).
Phase 8 depends on all feature phases.

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
