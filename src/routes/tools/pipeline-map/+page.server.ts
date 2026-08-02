import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { isWhitelisted } from '$lib/server/whitelist';
import { getPipelineMapMeta } from '$lib/server/pipeline-map';
import { authConfigured, AUTH_NOT_CONFIGURED } from '$lib/server/auth-config';

/**
 * Landing page for the pipeline map. The map document itself is served by
 * `view/+server.ts`, which repeats these checks — this page does not embed
 * it, because the site sends `frame-ancestors 'none'` and `X-Frame-Options:
 * DENY`, so even a same-origin iframe would be refused by our own headers.
 */
export const load: PageServerLoad = async (event) => {
	// Say so rather than redirecting to a sign-in page that was never
	// mounted — that lands on a 404 and reads as a broken link.
	if (!authConfigured()) {
		error(503, AUTH_NOT_CONFIGURED);
	}

	const session = await event.locals.auth?.();
	if (!session?.user?.email) {
		redirect(303, '/auth/signin');
	}

	// Re-checked here, not just in the sign-in callback. Sessions are JWTs
	// with a one-hour lifetime, so removing someone from the whitelist would
	// otherwise leave them with access until their token expired.
	if (!(await isWhitelisted(session.user.email))) {
		error(403, 'Access to the pipeline map is restricted.');
	}

	return { meta: await getPipelineMapMeta(), email: session.user.email };
};
