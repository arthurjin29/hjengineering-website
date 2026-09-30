import type { PageServerLoad } from './$types';
import { getPipelineMapMeta } from '$lib/server/pipeline-map';

/**
 * Public landing page for the pipeline map — no sign-in, no whitelist.
 *
 * It shows the summary counts from the published snapshot, or null when
 * nothing has been uploaded. The map document itself is served by
 * `view/+server.ts`; this page does not embed it, because the site sends
 * `frame-ancestors 'none'` and `X-Frame-Options: DENY`, so even a
 * same-origin iframe would be refused by our own headers.
 */
export const load: PageServerLoad = async () => {
	return { meta: await getPipelineMapMeta() };
};
