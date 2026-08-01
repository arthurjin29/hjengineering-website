# Deployment Guide — hjengineering.com.au

## Prerequisites

- Vercel account linked to this repo
- Google Cloud project with OAuth 2.0 credentials
- Sentry project (optional)
- Resend account for contact form emails (optional — logs to console without it)

## 1. Vercel Setup

```bash
# Link repo (run from project root)
npx vercel link
```

The project uses `@sveltejs/adapter-vercel` — no additional config needed.

## 2. Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_GOOGLE_ID` | Yes (for auth) | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes (for auth) | Google OAuth client secret |
| `AUTH_SECRET` | Yes (for auth) | Random 32+ char string (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | No | Resend API key for contact form emails |
| `SENTRY_DSN` | No | Sentry DSN for server-side error tracking |
| `VITE_SENTRY_DSN` | No | Sentry DSN for client-side error tracking |

Vercel KV variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) are auto-injected when you create a KV store in Vercel.

## 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or use existing)
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs:
   - `https://hjengineering.com.au/auth/callback/google`
   - `https://<your-vercel-preview-url>/auth/callback/google` (for preview deploys)
6. Copy Client ID and Secret to Vercel env vars

## 4. Vercel KV (Whitelist Store)

1. Vercel Dashboard → Storage → Create KV Store
2. Link to this project
3. Seed initial admin email:
   ```bash
   # Via Vercel KV CLI or REST API
   vercel env pull .env.local
   # Then use the KV dashboard to add:
   # Set "whitelist": ["arthur@hjengineering.com.au"]
   # Set "admins": ["arthur@hjengineering.com.au"]
   ```

## 4a. Heavy Lift Pipeline Map

The gated map at `/tools/pipeline-map` reads its HTML from the same KV store
as the whitelist. **The map data is never committed to this repository** —
this repo is public, so a login on the route would do nothing for a file
anyone can read on GitHub. Publishing is therefore a two-step process, and
neither step touches git.

1. Generate the BD-stripped map in the heavy-lift-pipeline project:
   ```bash
   .venv\Scripts\python.exe build.py --publish
   ```
   This refuses to write anything if its leak audit fails, and records the
   SHA-256 of what it wrote in `pipeline-map.meta.json`.

2. Upload it:
   ```bash
   vercel env pull .env.local     # once, for KV credentials
   npm run upload:pipeline-map
   ```
   The upload re-checks the file against that hash, so a file edited after
   the audit — or a sidecar from a different build — is rejected.

KV keys used: `pipeline-map:html`, `pipeline-map:meta`.

Access is the existing Google sign-in plus the KV whitelist, re-checked on
every request rather than only at sign-in (sessions are one-hour JWTs, so a
removal would otherwise stay live until the token expired). Grant or revoke
at `/admin/whitelist`.

Re-run both steps whenever the dataset changes — the map is a snapshot, not
a live view.

## 5. Preview Deploy

```bash
npx vercel
```

Test all features on the preview URL before DNS cutover.

## 6. DNS Cutover

1. Lower TTL to 300s on current DNS records (24-48 hours before)
2. In Vercel: Settings → Domains → Add `hjengineering.com.au`
3. Update DNS:
   - Option A: Point nameservers to Vercel
   - Option B: CNAME `hjengineering.com.au` → `cname.vercel-dns.com`
4. Vercel auto-provisions SSL certificate
5. Verify: `curl -I https://hjengineering.com.au`

## 7. Post-Launch Checklist

- [ ] All pages load on production domain
- [ ] Google OAuth sign-in works with production redirect URI
- [ ] Contact form sends emails via Resend
- [ ] Sling calculator works (pure client-side)
- [ ] Sitemap submitted to Google Search Console
- [ ] Sentry receiving error events
- [ ] CSP headers enforcing (check response headers)
- [ ] robots.txt accessible at /robots.txt
