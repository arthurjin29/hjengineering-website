import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { env } from '$env/dynamic/private';
import { isWhitelisted, requestAccess, addToWhitelist, isAllowedDomain } from '$lib/server/whitelist';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Google({
			clientId: env.AUTH_GOOGLE_ID,
			clientSecret: env.AUTH_GOOGLE_SECRET
		})
	],
	secret: env.AUTH_SECRET,
	session: {
		strategy: 'jwt',
		maxAge: 60 * 60 // 1 hour
	},
	callbacks: {
		async signIn({ user, profile }) {
			if (!user.email) return false;
			if (await isWhitelisted(user.email)) return true;

			// Auto-admit the operating domains. `profile.hd` is Google's
			// hosted-domain claim — asserted by Google for Workspace accounts,
			// not parsed by us from the address.
			const hd = typeof profile?.hd === 'string' ? profile.hd : null;
			const verified = profile?.email_verified === true;
			if (isAllowedDomain(user.email, hd, verified)) {
				// Recorded on first sign-in so there is a list of who has
				// actually used the domain rule, and so an individual can be
				// removed without dropping the whole domain.
				await addToWhitelist(user.email);
				return true;
			}

			// Not approved yet. Record the attempt and send them somewhere
			// that says so, rather than returning false — which produces a
			// bare AccessDenied error and leaves no trace that anyone asked.
			await requestAccess(user.email, user.name);
			return '/access-requested';
		}
	},
	// No `pages.signIn` override. `/auth/signin` is Auth.js's *own* built-in
	// sign-in page (basePath `/auth` + `/signin`), so naming it here declared
	// a custom page at the very path Auth.js already serves: the handler
	// redirected to the configured page, which was itself, and the browser
	// bounced until it gave up. Routes still redirect to `/auth/signin` —
	// that path is correct, it just must not be re-declared as custom.
	trustHost: true
});
