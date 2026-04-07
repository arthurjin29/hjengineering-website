import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';

const authHandle: Handle = async ({ event, resolve }) => {
	// Only enable Auth.js when credentials are configured
	if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET && env.AUTH_SECRET) {
		const { handle } = await import('$lib/auth');
		return handle({ event, resolve });
	}
	return resolve(event);
};

const cspHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set(
		'Content-Security-Policy-Report-Only',
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' https://*.vercel-analytics.com https://*.sentry.io",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: blob:",
			"font-src 'self'",
			"connect-src 'self' https://*.vercel-analytics.com https://*.sentry.io",
			"frame-src https://accounts.google.com"
		].join('; ')
	);

	return response;
};

export const handle = sequence(authHandle, cspHandle);
