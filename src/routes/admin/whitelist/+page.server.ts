import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	isAdmin,
	getWhitelist,
	addToWhitelist,
	removeFromWhitelist,
	getPendingRequests,
	approveRequest,
	clearRequest
} from '$lib/server/whitelist';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth?.();
	if (!session?.user?.email) {
		redirect(303, '/auth/signin');
	}

	const admin = await isAdmin(session.user.email);
	if (!admin) {
		error(403, 'Admin access required');
	}

	const [whitelist, pending] = await Promise.all([getWhitelist(), getPendingRequests()]);
	return { whitelist, pending, adminEmail: session.user.email };
};

export const actions = {
	add: async (event) => {
		const session = await event.locals.auth?.();
		if (!session?.user?.email || !(await isAdmin(session.user.email))) {
			error(403, 'Admin access required');
		}

		const data = await event.request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Valid email required' });
		}

		await addToWhitelist(email);
		return { success: true, message: `Added ${email}` };
	},

	remove: async (event) => {
		const session = await event.locals.auth?.();
		if (!session?.user?.email || !(await isAdmin(session.user.email))) {
			error(403, 'Admin access required');
		}

		const data = await event.request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();

		if (!email) {
			return fail(400, { error: 'Email required' });
		}

		// Prevent removing yourself
		if (email === session.user.email.toLowerCase()) {
			return fail(400, { error: 'Cannot remove your own email' });
		}

		await removeFromWhitelist(email);
		return { success: true, message: `Removed ${email}` };
	},

	approve: async (event) => {
		const session = await event.locals.auth?.();
		if (!session?.user?.email || !(await isAdmin(session.user.email))) {
			error(403, 'Admin access required');
		}

		const data = await event.request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();
		if (!email) {
			return fail(400, { error: 'Email required' });
		}

		await approveRequest(email);
		return { success: true, message: `Approved ${email}` };
	},

	deny: async (event) => {
		const session = await event.locals.auth?.();
		if (!session?.user?.email || !(await isAdmin(session.user.email))) {
			error(403, 'Admin access required');
		}

		const data = await event.request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();
		if (!email) {
			return fail(400, { error: 'Email required' });
		}

		// Only clears the queue entry. Denying is not a block — if they sign
		// in again the request comes back, which is the right default for a
		// mistake and harmless for anyone genuinely uninvited.
		await clearRequest(email);
		return { success: true, message: `Dismissed request from ${email}` };
	}
} satisfies Actions;
