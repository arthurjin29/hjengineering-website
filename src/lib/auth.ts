import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { env } from '$env/dynamic/private';
import { isWhitelisted, requestAccess } from '$lib/server/whitelist';

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
		async signIn({ user }) {
			if (!user.email) return false;
			if (await isWhitelisted(user.email)) return true;

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
