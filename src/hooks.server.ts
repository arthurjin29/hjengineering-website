import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Auth.js handle — disabled until Google OAuth credentials are configured.
// Uncomment after setting AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET in .env
// import { handle as authHandle } from '$lib/auth';

const cspHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// CSP in report-only mode during development
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

// When auth is enabled, use: sequence(authHandle, cspHandle)
export const handle = sequence(cspHandle);
