import { getRedis } from './redis';

/**
 * Storage for the heavy-lift pipeline map.
 *
 * The map shows which energy and data-centre projects are being built, where,
 * and at what stage. It is served publicly, but it is not committed to this
 * repository because it is a generated file: `build.py --publish` rebuilds it
 * from the pipeline dataset and audits it for anything that must not leave
 * the office. Keeping it in Redis means a data refresh is an upload, not a
 * commit and redeploy, and the audited file is the only copy that ships.
 *
 * Uploaded by `scripts/upload-pipeline-map.mjs` from the output of
 * `build.py --publish` in the heavy-lift-pipeline project.
 */
export const MAP_KEY = 'pipeline-map:html';
export const MAP_META_KEY = 'pipeline-map:meta';

export interface PipelineMapMeta {
	/** ISO date the map was generated. */
	published: string;
	/** Projects included, and how many were withheld for restricted provenance. */
	projects: number;
	withheld: number;
}

async function getKv() {
	return await getRedis();
}

/** The published map HTML, or null when nothing has been uploaded yet. */
export async function getPipelineMap(): Promise<string | null> {
	const store = await getKv();
	if (!store) return null;
	return await store.get(MAP_KEY);
}

export async function getPipelineMapMeta(): Promise<PipelineMapMeta | null> {
	const store = await getKv();
	if (!store) return null;
	const raw = await store.get(MAP_META_KEY);
	if (!raw) return null;
	// The page is public, so pass on only the three counts it shows — never
	// whatever else a manual upload might have put in the stored object.
	const { published, projects, withheld } = JSON.parse(raw) as PipelineMapMeta;
	return { published, projects, withheld };
}
