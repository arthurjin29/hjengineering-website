import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import * as Sentry from '@sentry/sveltekit';

if (env.SENTRY_DSN) {
	Sentry.init({
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 0.1,
		environment: dev ? 'development' : 'production'
	});
}

export const handleError = Sentry.handleErrorWithSentry();

const authHandle: Handle = async ({ event, resolve }) => {
	if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET && env.AUTH_SECRET) {
		const { handle } = await import('$lib/auth');
		return handle({ event, resolve });
	}
	return resolve(event);
};

const securityHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	const cspDirectives = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://*.vercel-analytics.com https://*.vercel-scripts.com https://*.sentry.io",
		"style-src 'self' 'unsafe-inline'",
		// Tile hosts for the map tools. CARTO serves the dark basemap and Esri
		// the satellite layer used by the pipeline map — satellite view is the
		// one that shows site access, so it earns its place. Image sources
		// only: no script, connect or frame permission is widened here.
		"img-src 'self' data: blob: https://*.tile.openstreetmap.org " +
			"https://*.basemaps.cartocdn.com https://server.arcgisonline.com",
		"font-src 'self'",
		"connect-src 'self' https://*.vercel-analytics.com https://*.sentry.io",
		"frame-src https://accounts.google.com",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'"
	].join('; ');

	// Report-only in dev, enforcing in production
	const header = dev ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
	response.headers.set(header, cspDirectives);

	// Additional security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};

export const handle = sequence(authHandle, securityHandle);
