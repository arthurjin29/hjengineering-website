import type { RequestHandler } from './$types';
import { getPipelineMap } from '$lib/server/pipeline-map';

/**
 * Serves the pipeline map as a full HTML document. Public — no sign-in and
 * no whitelist; the landing page at `/tools/pipeline-map` is the one meant
 * for search engines, so this response carries `x-robots-tag: noindex`.
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

export const GET: RequestHandler = async () => {
	const html = await getPipelineMap();
	if (!html) {
		return deny(
			503,
			'Map being updated',
			'The project map is being updated. Please check back shortly.'
		);
	}

	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			// The same document for every visitor, so a shared cache may hold
			// it. Ten minutes bounds how long a re-upload takes to show.
			'cache-control': 'public, max-age=600',
			'x-robots-tag': 'noindex'
		}
	});
};
