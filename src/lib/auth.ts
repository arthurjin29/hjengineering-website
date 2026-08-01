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
	pages: {
		signIn: '/auth/signin'
	},
	trustHost: true
});
