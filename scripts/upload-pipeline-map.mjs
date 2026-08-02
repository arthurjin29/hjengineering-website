/**
 * Upload the published heavy-lift pipeline map into the project's Redis store.
 *
 * The map is business-development material and this repository is public, so
 * the file is deliberately never committed here. It is generated in the
 * heavy-lift-pipeline project by `build.py --publish` — which refuses to
 * write anything if its own leak audit fails — and pushed into KV by this
 * script. The gated route reads it back at request time.
 *
 *   node scripts/upload-pipeline-map.mjs [path-to-pipeline-map.html]
 *
 * Requires REDIS_URL. Get it with:
 *   npx vercel link && npx vercel env pull .env.local
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createClient } from 'redis';

const DEFAULT_SOURCE = 'D:/heavy-lift-pipeline/dist/public/pipeline-map.html';
const MAP_KEY = 'pipeline-map:html';
const MAP_META_KEY = 'pipeline-map:meta';

function loadEnv(text) {
	for (const line of text.split('\n')) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
		if (m && !process.env[m[1]]) {
			process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
		}
	}
}

async function main() {
	const source = process.argv[2] ?? DEFAULT_SOURCE;

	try {
		loadEnv(await readFile('.env.local', 'utf8'));
	} catch {
		// Fine — the variables may already be in the environment.
	}

	const url = process.env.REDIS_URL;
	if (!url) {
		console.error(
			'REDIS_URL is not set. Run:  npx vercel link && npx vercel env pull .env.local'
		);
		process.exit(1);
	}

	const html = await readFile(source, 'utf8');

	// Counted from the rendered table so the figure reported on the landing
	// page comes from the artifact itself, not from something we were told.
	const projects = (html.match(/class="row/g) ?? []).length;
	if (projects === 0) {
		console.error(`UPLOAD BLOCKED — no project rows found in ${source}.`);
		process.exit(1);
	}

	// The build writes this beside the HTML. Read rather than retyped, so the
	// withheld count cannot drift from the build that produced the file.
	const meta = JSON.parse(await readFile(source.replace(/\.html$/, '.meta.json'), 'utf8'));

	// The build refuses to write this file unless its own leak audit passes,
	// and records the hash of exactly what it wrote. Verifying that here
	// proves the bytes being uploaded are the bytes that passed the audit —
	// a stronger guarantee than re-scanning, and it keeps the denylist terms
	// themselves out of this repository, which is public.
	const digest = createHash('sha256').update(html, 'utf8').digest('hex');
	if (digest !== meta.sha256) {
		console.error(
			`UPLOAD BLOCKED — ${source} does not match the hash its build recorded. ` +
				'It was edited after the audit, or the sidecar is from a different build. ' +
				'Re-run build.py --publish.'
		);
		process.exit(1);
	}

	if (meta.projects !== projects) {
		console.error(
			`UPLOAD BLOCKED — sidecar says ${meta.projects} projects but the HTML has ${projects}. ` +
				'The two were produced by different builds.'
		);
		process.exit(1);
	}

	const kv = createClient({ url });
	kv.on('error', (e) => console.error('redis:', e?.message ?? e));
	await kv.connect();

	await kv.set(MAP_KEY, html);
	await kv.set(
		MAP_META_KEY,
		JSON.stringify({
			published: meta.published,
			projects: meta.projects,
			withheld: meta.withheld
		})
	);

	// Read back rather than trusting the write: a silent truncation would
	// otherwise surface as a half-rendered map for whoever opens it next.
	const readback = await kv.get(MAP_KEY);
	if (readback !== html) {
		console.error('UPLOAD FAILED — the value read back does not match what was sent.');
		await kv.quit();
		process.exit(1);
	}
	await kv.quit();

	console.log(`uploaded ${source}`);
	console.log(`  ${html.length} bytes, ${projects} projects — read-back verified`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
