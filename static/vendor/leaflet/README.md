# Leaflet 1.9.4 — vendored

Served from this origin rather than a CDN because the site's CSP is
`script-src 'self'` (see `src/hooks.server.ts`). A CDN `<script>` is blocked
outright, so the pipeline map would render an empty page.

Fetched 2026-08-01 from `https://unpkg.com/leaflet@1.9.4/dist/`:

| File | SHA-256 |
|---|---|
| `leaflet.js` | `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a` |
| `leaflet.css` | `a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6` |

`images/` holds the default marker and layer-control sprites that
`leaflet.css` references by relative path. The pipeline map draws
`circleMarker` (SVG) rather than image markers, so only the layer-control
sprites are actually used — the marker icons are kept so the copy stays a
faithful drop-in for any future page.

These files are public library code, so they are safe to serve from
`static/`, which bypasses `hooks.server.ts` and is reachable without
authentication. Nothing in this directory is project data.

To upgrade: re-download the same two files at the new version, update the
hashes above, and re-check that Leaflet's CSS still references only relative
`images/` paths.
