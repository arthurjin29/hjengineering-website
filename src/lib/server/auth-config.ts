import { env } from '$env/dynamic/private';

/**
 * Whether Google sign-in is actually configured.
 *
 * `hooks.server.ts` mounts Auth.js only when all three variables are set. If
 * any is missing the auth handler never loads, `/auth/signin` does not exist,
 * and a gated route that redirects there lands the visitor on a bare 404 —
 * which reads as a broken link rather than an unconfigured deployment. This
 * predicate lets a guard say so plainly instead.
 *
 * The condition is deliberately identical to the one in `hooks.server.ts`; if
 * that one changes, this must change with it, or a route will promise a
 * sign-in page that was never mounted.
 */
export function authConfigured(): boolean {
	return Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET && env.AUTH_SECRET);
}

export const AUTH_NOT_CONFIGURED =
	'Sign-in is not configured on this deployment yet, so this page cannot be opened. ' +
	'Set AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET and AUTH_SECRET in Vercel — see DEPLOY.md sections 3 and 4.';
