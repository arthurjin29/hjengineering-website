import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { isWhitelisted } from '$lib/server/whitelist';
import { getPipelineMap } from '$lib/server/pipeline-map';

/**
 * Serves the pipeline map as a full HTML document.
 *
 * The checks here are not a duplicate of the landing page's — this endpoint
 * is directly addressable, so it has to stand on its own. Anyone who found
 * this URL would otherwise reach the map without passing the page.
 *
 * Errors are returned as small HTML documents rather than thrown with
 * `error()`, because a thrown error from an endpoint is serialised as JSON
 * and this URL is opened by a browser, not by a fetch.
 */
function deny(status: number, heading: string, detail: string): Response {
	return new Response(
		`<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${heading} — HJ Engineering</title>
<style>body{font-family:'Segoe UI',system-ui,sans-serif;background:#141a21;
color:#e8edf2;display:grid;place-items:center;height:100vh;margin:0}
div{max-width:34rem;padding:2rem;text-align:center}
h1{font-size:1.25rem;margin:0 0 .75rem}p{color:#8b9aa8;line-height:1.6;margin:0}
a{color:#7fb2ff}</style></head>
<body><div><h1>${heading}</h1><p>${detail}</p></div></body></html>`,
		{ status, headers: { 'content-type': 'text/html; charset=utf-8' } }
	);
}

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.email) {
		redirect(303, '/auth/signin');
	}

	if (!(await isWhitelisted(session.user.email))) {
		return deny(
			403,
			'Access restricted',
			'Your account is not on the access list for the pipeline map. ' +
				'Contact <a href="mailto:arthur@hjengineering.com.au">Arthur</a> if you need access.'
		);
	}

	const html = await getPipelineMap();
	if (!html) {
		return deny(
			503,
			'Not published yet',
			'The pipeline map has not been uploaded. Run <code>build.py --publish</code> ' +
				'in heavy-lift-pipeline, then <code>npm run upload:pipeline-map</code>.'
		);
	}

	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			// Never cached by a shared cache: this is per-user gated content,
			// and a CDN copy would outlive the session that earned it.
			'cache-control': 'private, no-store'
		}
	});
};
