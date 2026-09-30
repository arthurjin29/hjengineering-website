/**
 * Copy the published heavy-lift pipeline map into the site.
 *
 * The map is built in the heavy-lift-pipeline project by `build.py --publish`,
 * which refuses to write anything if its own leak audit fails and records the
 * sha256 of what it wrote. This script checks the file against that hash and
 * against its project count, then copies it to src/lib/server/data/ with a
 * trimmed sidecar (date and counts only). Commit and push to publish.
 *
 *   node scripts/sync-pipeline-map.mjs [path-to-pipeline-map.html]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const DEFAULT_SOURCE = 'D:/heavy-lift-pipeline/dist/public/pipeline-map.html';
const TARGET_HTML = 'src/lib/server/data/pipeline-map.html';
const TARGET_META = 'src/lib/server/data/pipeline-map.meta.json';

async function main() {
	const source = process.argv[2] ?? DEFAULT_SOURCE;
	const html = await readFile(source, 'utf8');

	// Counted from the rendered table so the figure on the landing page comes
	// from the file itself, not from something we were told.
	const projects = (html.match(/class="row/g) ?? []).length;
	if (projects === 0) {
		console.error(`SYNC BLOCKED — no project rows found in ${source}.`);
		process.exit(1);
	}

	const meta = JSON.parse(await readFile(source.replace(/\.html$/, '.meta.json'), 'utf8'));

	// Proves the bytes being copied are the bytes that passed the build's
	// audit, and keeps the denylist terms themselves out of this public repo.
	const digest = createHash('sha256').update(html, 'utf8').digest('hex');
	if (digest !== meta.sha256) {
		console.error(
			`SYNC BLOCKED — ${source} does not match the hash its build recorded. ` +
				'It was edited after the audit, or the sidecar is from a different build. ' +
				'Re-run build.py --publish.'
		);
		process.exit(1);
	}

	if (meta.projects !== projects) {
		console.error(
			`SYNC BLOCKED — sidecar says ${meta.projects} projects but the HTML has ${projects}. ` +
				'Re-run build.py --publish.'
		);
		process.exit(1);
	}

	// The build's sidecar also lists withheld project names; those must never
	// reach this repository, so only the date, counts and hash are kept.
	const trimmed = {
		published: meta.published,
		projects,
		withheld: meta.withheld,
		sha256: digest
	};

	await writeFile(TARGET_HTML, html, 'utf8');
	await writeFile(TARGET_META, JSON.stringify(trimmed, null, '\t') + '\n', 'utf8');
	console.log(
		`Synced ${projects} projects (${meta.withheld} withheld) published ${meta.published} ` +
			`into ${TARGET_HTML}. Commit and push to publish.`
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
