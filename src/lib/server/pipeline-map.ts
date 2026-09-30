import html from './data/pipeline-map.html?raw';
import meta from './data/pipeline-map.meta.json';

/**
 * The heavy-lift pipeline map, bundled with the site.
 *
 * The map shows which wind, data-centre, power and water projects are being
 * built in VIC, NSW and SA, and at what stage. It is public, so it ships with
 * each deploy rather than being read from a store at request time.
 *
 * Both files are generated: `build.py --publish` in the heavy-lift-pipeline
 * project rebuilds the map and audits it for anything that must not leave
 * the office, and `scripts/sync-pipeline-map.mjs` copies the audited file
 * here after checking it against the hash that build recorded.
 */
export interface PipelineMapMeta {
	/** ISO date the map was generated. */
	published: string;
	/** Projects included, and how many were withheld for restricted provenance. */
	projects: number;
	withheld: number;
}

/** The published map HTML, or null when none has been synced. */
export async function getPipelineMap(): Promise<string | null> {
	return html.trim() ? html : null;
}

export async function getPipelineMapMeta(): Promise<PipelineMapMeta | null> {
	if (!html.trim()) return null;
	// Only the three counts the page shows.
	const { published, projects, withheld } = meta as PipelineMapMeta;
	return { published, projects, withheld };
}
