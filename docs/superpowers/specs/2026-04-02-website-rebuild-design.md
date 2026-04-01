# HJ Engineering Website — Design Spec

**Date:** 2026-04-02
**Project:** hjengineering.com.au rebuild
**Location:** `D:\HJ Engineering\hjengineering-website`

## 1. Overview

Complete rebuild of hjengineering.com.au from Laravel/Livewire (Katana CMS) to a SvelteKit monolith. The current site is a heavy CMS with template remnants. The new site is a lean marketing site with two integrated engineering tools.

**Goals:**
- Professional brochure site positioning HJ Engineering as a technical specialist ("deep experts in their niche")
- Two integrated tools: Sling Length Calculator (public) and NHVR Access Map (authenticated)
- Audience: crane hire companies and construction companies equally
- Minimal maintenance — static content with occasional blog posts

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | SvelteKit | Arthur knows Svelte 5 from eng-assistant |
| Styling | Tailwind CSS 4 | Utility-first, matches the design tokens |
| Auth | Auth.js (SvelteKit adapter) | Google OAuth for access map |
| Blog | mdsvex | Markdown posts with Svelte components |
| Hosting | Vercel (free tier) | SvelteKit-native adapter, zero config |
| Domain | hjengineering.com.au | DNS pointed to Vercel later |

No database needed. Auth state uses Vercel KV (or a small SQLite via Turso) to store the invite whitelist — a list of approved Google email addresses.

## 3. Site Map

```
hjengineering.com.au
├── /                              Home
├── /services                      Services overview
│   ├── /services/lifting-crane-planning
│   ├── /services/temporary-works
│   ├── /services/ground-bogmat-assessment
│   └── /services/risk-safety-engineering
├── /about                         Background, PE, AI approach
├── /resources                     Downloadable checklists/guides
├── /blog                          Post list
│   └── /blog/[slug]               Individual post (mdsvex)
├── /tools/sling-calculator        Public — client-side sling calc
├── /tools/access-map              Authenticated — NHVR route planner
├── /contact                       Form + details
├── /portfolio                     Hidden from nav (future)
├── /auth/signin                   Google OAuth sign-in page
└── /admin/whitelist               Arthur-only: manage approved emails
```

## 4. Visual Design

### 4.1 Colour Palette

The site uses a **light background** for content areas with **dark sections** for the hero and bottom CTA only.

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-dark` | `#0f172a` (Slate 900) | Hero, CTA sections |
| `--bg-card-dark` | `#1e293b` (Slate 800) | Dark section cards |
| `--bg-light` | `#ffffff` | Main content background |
| `--bg-subtle` | `#f1f5f9` (Slate 100) | Alternating sections |
| `--primary` | `#06b6d4` (Cyan 500) | Accents, links, highlights |
| `--primary-hover` | `#0891b2` (Cyan 600) | Hover states, credentials bar |
| `--text-dark` | `#0f172a` | Headings on light bg |
| `--text-body` | `#64748b` (Slate 500) | Body text on light bg |
| `--text-light` | `#f1f5f9` | Text on dark bg |
| `--text-muted` | `#94a3b8` (Slate 400) | Secondary text |
| `--border` | `#e2e8f0` (Slate 200) | Card borders on light bg |

### 4.2 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Inter | 700 | 24-36px |
| Subheadings | Inter | 500 | 18-20px |
| Body | Inter | 400 | 16px, line-height 1.7 |
| Technical labels | JetBrains Mono | 400 | 14px |
| Nav links | Inter | 400 | 13-14px |

### 4.3 Design Elements

- **Service cards:** Light bg (`#f8fafc`), left cyan border accent (`3px solid #0891b2`), rounded corners
- **CTA buttons:** Primary = solid cyan bg with dark text; Secondary = cyan outline with cyan text
- **Credentials bar:** Full-width `#0891b2` bg, white text, sits below hero — shows PE number + ABN only
- **Standards note:** Subtle 12px text below services grid: "Work performed in accordance with AS 3775, AS 4100, AS 1170..."
- **Hero:** Dark gradient (`#0f172a` to `#1e293b`) with faint blueprint grid overlay (4% opacity cyan lines)
- **Footer:** `#020617` (near-black), copyright + LinkedIn/GitHub links

### 4.4 Responsive Approach

- Mobile-first Tailwind breakpoints (`sm`, `md`, `lg`)
- Nav collapses to hamburger on mobile
- Service cards stack to single column on mobile
- Tools cards stack on mobile
- Hero text scales down, buttons stack vertically

## 5. Page Specifications

### 5.1 Home (`/`)

Sections top to bottom (as shown in approved homepage-layout-v2 mockup):

1. **Nav bar** — White bg, "HJ Engineering" in cyan-600, nav links (Services, Tools dropdown, Resources, About, Blog), "Contact" CTA button
2. **Hero** — Dark gradient + blueprint grid. Label: "Independent Engineering Consultancy". Heading: "Specialist Crane & Lifting Engineering for Australian Construction". Subtext + two CTAs (Get in Touch, View Services)
3. **Credentials bar** — Cyan-600 bg. "Registered Professional Engineer — PE0018121 · ABN 34 695 221 768"
4. **Services grid** — White bg. Section label "What We Do", heading "Engineering Services". 2x2 grid of service cards with name + one-line description + "Learn more" link. Standards footnote below.
5. **Tools section** — Slate-100 bg. Section label "Engineering Tools", heading "Free Online Tools". 2-column cards for Sling Calculator and Access Map with icon, description, "Open Tool" link. Access Map card shows a small lock icon indicating login required.
6. **CTA section** — Dark bg. "Need Engineering Support?" + contact button
7. **Footer** — Near-black. Copyright + social links

### 5.2 Services (`/services` + sub-pages)

**Index page:** Full descriptions of each service area in a vertical layout. Each service section has heading, 2-3 paragraphs, and a list of specific deliverables (e.g., "Crane lift plans", "Outrigger load calculations").

**Sub-pages** (`/services/[slug]`): Dedicated page per service with:
- Hero banner (service name + one-liner)
- Detailed description (3-4 paragraphs)
- Deliverables list
- Relevant standards referenced
- CTA to contact

Content for all 4 services:
1. **Lifting & Crane Planning** — Lift plans, outrigger loads, lifting studies, complex lift support
2. **Temporary Works** — Walkway checks, access platforms, temporary support, stability analysis
3. **Ground & Bogmat Assessment** — Ground bearing pressure, bogmat verification, load spread analysis
4. **Risk & Safety Engineering** — Hazard ID, risk assessment, engineering controls, safety reviews

### 5.3 About (`/about`)

- **Background section** — Arthur's engineering background, PE registration, experience
- **Our Approach section** — Static section describing how HJ Engineering uses AI tools to augment engineering work. Not a curated AI news feed — just explains the philosophy.
- **Credentials** — PE number, ABN, professional memberships

### 5.4 Resources (`/resources`)

- Grid of downloadable checklists/guides (PDF or DOCX)
- Can launch empty with a "Coming soon" note
- Each resource: title, description, file type badge, download button
- Static files served from `/static/resources/`

### 5.5 Blog (`/blog` + `/blog/[slug]`)

- **Index:** List of posts with title, date, excerpt, read time
- **Post page:** mdsvex-rendered Markdown with frontmatter (title, date, description, tags)
- Blog posts stored in `src/content/blog/*.md`
- Occasional posts about AI in construction, case studies, engineering insights
- No categories/tags filtering initially — simple chronological list

### 5.6 Tools — Sling Calculator (`/tools/sling-calculator`)

- **Public** — no login required
- Client-side port of the existing sling-length-calculator (`D:\sling-length-calculator`)
- All 6 rigging configurations
- Pure Svelte 5 — all calculation logic runs in the browser
- No backend dependency

### 5.7 Tools — Access Map (`/tools/access-map`)

- **Authenticated** — requires Google OAuth sign-in
- Unauthenticated users see a landing page explaining the tool + "Sign in with Google" button
- If signed in but not on the whitelist: "Access pending — contact HJ Engineering for access"
- Authorized users get the full Leaflet map UI
- **Backend:** Connects to the existing FastAPI backend (`D:\Access_map_project`) deployed separately
- The SvelteKit frontend embeds the Leaflet map + controls, API calls go to the FastAPI server
- Permit data is fetched from the backend API — the SvelteKit app never stores permit data locally

### 5.8 Contact (`/contact`)

- Contact form (name, email, phone, company, message)
- Form submissions: sent via a form service (Formspree or Vercel serverless function that sends email)
- Display: phone number, email, ABN
- No physical address (home-based consultancy)

### 5.9 Portfolio (`/portfolio`)

- Route exists but **hidden from nav** until populated
- Future: project grid with thumbnail, title, brief description
- Light format — no case study pages initially

### 5.10 Admin — Whitelist (`/admin/whitelist`)

- Protected route — only Arthur's Google account can access
- Simple table: email addresses of approved users
- Add/remove emails
- This is the invite-only mechanism: if a user's Google email is in this list, they get access to the access map

## 6. Authentication

### 6.1 Flow

```
User clicks "Sign in with Google" on /tools/access-map
  → Google OAuth consent screen
  → Callback to /auth/callback/google
  → Auth.js creates session
  → Check email against whitelist
  → If approved: redirect to /tools/access-map (full UI)
  → If not approved: show "Access pending" message
```

### 6.2 Implementation

- **Library:** Auth.js (`@auth/sveltekit`)
- **Provider:** Google OAuth only
- **Session:** JWT-based (stateless, no session DB needed)
- **Whitelist store:** Vercel KV (Redis-based key-value store, free tier: 30k requests/month). Stores approved emails as a Set. Vercel's filesystem is read-only at runtime, so a JSON file won't work for admin CRUD. If Vercel KV is overkill at launch, an alternative is Turso (SQLite edge DB, also free tier).
- **Admin route:** `/admin/whitelist` — protected by checking session email against a hardcoded admin email (Arthur's)
- **Scope:** Only `/tools/access-map` requires auth. All other pages are fully public.

### 6.3 Google OAuth Setup

- Google Cloud Console project: create OAuth 2.0 credentials
- Authorized redirect URI: `https://hjengineering.com.au/auth/callback/google`
- Environment variables: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`
- These go in Vercel env vars (never committed)

## 7. Navigation

**Desktop nav bar** (white bg, fixed top):
```
[HJ Engineering]   Services   Tools ▾   Resources   About   Blog   [Contact]
                                │
                                ├── Sling Calculator
                                └── Access Map 🔒
```

- "HJ Engineering" is the logo/wordmark (cyan-600), links to `/`
- "Contact" is styled as a CTA button (cyan bg)
- "Tools" has a dropdown showing both tools; Access Map shows a lock icon
- On mobile: hamburger menu, full-screen overlay nav

## 8. SEO & Performance

- **Meta tags:** Per-page title, description, og:image via SvelteKit `+page.ts` load functions
- **Sitemap:** Auto-generated via `@sveltejs/adapter-vercel` or a custom endpoint
- **Structured data:** LocalBusiness schema on homepage (JSON-LD)
- **Performance:** SvelteKit SSR for all marketing pages, CSR for tools. Images optimized via `@sveltejs/enhanced-img` or Vercel Image Optimization.
- **Analytics:** Vercel Analytics (privacy-friendly, no cookie banner needed)

## 9. Deployment

- **Adapter:** `@sveltejs/adapter-vercel`
- **Build:** `npm run build` via Vercel CI
- **Preview:** Vercel preview deployments on branches
- **DNS:** Point `hjengineering.com.au` to Vercel when ready (CNAME or nameservers)
- **Access Map backend:** Deployed separately (FastAPI on a VPS or similar). The SvelteKit app calls it via `PUBLIC_ACCESS_MAP_API_URL` env var.
- **Env vars on Vercel:** `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `PUBLIC_ACCESS_MAP_API_URL`

## 10. File Structure

```
hjengineering-website/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte           Global layout (nav + footer)
│   │   ├── +page.svelte             Homepage
│   │   ├── services/
│   │   │   ├── +page.svelte         Services index
│   │   │   └── [slug]/+page.svelte  Service detail
│   │   ├── about/+page.svelte
│   │   ├── resources/+page.svelte
│   │   ├── blog/
│   │   │   ├── +page.svelte         Blog index
│   │   │   └── [slug]/+page.svelte  Blog post
│   │   ├── tools/
│   │   │   ├── sling-calculator/+page.svelte
│   │   │   └── access-map/
│   │   │       ├── +page.svelte     Map UI (auth-gated)
│   │   │       └── +page.server.ts  Auth check + whitelist
│   │   ├── contact/+page.svelte
│   │   ├── portfolio/+page.svelte
│   │   ├── auth/
│   │   │   └── [...auth]/+server.ts Auth.js catch-all
│   │   └── admin/
│   │       └── whitelist/
│   │           ├── +page.svelte     Whitelist management UI
│   │           └── +page.server.ts  Admin auth check + CRUD
│   ├── lib/
│   │   ├── components/              Shared components (Nav, Footer, ServiceCard, etc.)
│   │   ├── data/
│   │   │   └── services.ts          Service content data
│   │   ├── server/
│   │   │   └── whitelist.ts         Vercel KV whitelist operations
│   │   ├── sling-calc/              Ported sling calculator logic
│   │   └── auth.ts                  Auth.js config (Google provider)
│   ├── content/
│   │   └── blog/                    Markdown blog posts
│   └── app.css                      Tailwind base + design tokens
├── static/
│   ├── resources/                   Downloadable PDFs/guides
│   └── favicon.ico
├── svelte.config.js
├── tailwind.config.js
├── package.json
└── .env.example                     Template for env vars
```

## 11. Content Requiring Arthur's Input

Before implementation, these items need real content from Arthur:

1. **About page text** — background, experience, how you describe HJ Engineering
2. **Service descriptions** — detailed text for each of the 4 service sub-pages (I can draft, you review)
3. **Contact details** — phone number, email address to display
4. **Initial whitelist** — email addresses for access map beta users
5. **Blog posts** — at least 1 draft post for launch (optional, can launch empty)
6. **Resources** — any existing checklists/guides to upload (optional, can launch with "Coming soon")
7. **Social links** — LinkedIn URL, GitHub URL for footer
