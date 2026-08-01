import { env } from '$env/dynamic/private';

/**
 * Storage for the heavy-lift pipeline map.
 *
 * The map is business-development material: which energy and data-centre
 * projects we are tracking, where, and at what stage. It is deliberately NOT
 * committed to this repository, because this repository is public — a login
 * on the route would do nothing for a file anyone can read on GitHub.
 *
 * It lives in Vercel KV instead, the same store the access whitelist uses,
 * and is fetched server-side by a route that checks the session first. That
 * keeps the data perimeter and the auth perimeter the same shape.
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
	if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return null;
	const { kv } = await import('@vercel/kv');
	return kv;
}

/** The published map HTML, or null when nothing has been uploaded yet. */
export async function getPipelineMap(): Promise<string | null> {
	const store = await getKv();
	if (!store) return null;
	return await store.get<string>(MAP_KEY);
}

export async function getPipelineMapMeta(): Promise<PipelineMapMeta | null> {
	const store = await getKv();
	if (!store) return null;
	return await store.get<PipelineMapMeta>(MAP_META_KEY);
}
