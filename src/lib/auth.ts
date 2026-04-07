import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { env } from '$env/dynamic/private';
import { isWhitelisted } from '$lib/server/whitelist';

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
			return await isWhitelisted(user.email);
		}
	},
	pages: {
		signIn: '/auth/signin'
	},
	trustHost: true
});
