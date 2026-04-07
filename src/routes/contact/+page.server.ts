import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { checkRateLimit } from '$lib/server/rate-limit';

export const actions = {
	default: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		const { allowed } = await checkRateLimit(ip);
		if (!allowed) {
			return fail(429, { error: 'Too many submissions. Please try again in a minute.' });
		}

		const data = await request.formData();

		const name = data.get('name')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';
		const phone = data.get('phone')?.toString().trim() ?? '';
		const company = data.get('company')?.toString().trim() ?? '';
		const message = data.get('message')?.toString().trim() ?? '';
		const honeypot = data.get('website')?.toString() ?? '';

		const values = { name, email, phone, company, message };

		// Honeypot check
		if (honeypot) {
			// Silently accept to not reveal the trap
			return { success: true };
		}

		// Validation
		if (!name) {
			return fail(400, { error: 'Name is required.', values });
		}
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'A valid email address is required.', values });
		}
		if (!message) {
			return fail(400, { error: 'Message is required.', values });
		}
		if (message.length > 5000) {
			return fail(400, { error: 'Message is too long (max 5000 characters).', values });
		}

		// Send email — Resend in production, console.log in dev
		try {
			if (process.env.RESEND_API_KEY) {
				const { Resend } = await import('resend');
				const resend = new Resend(process.env.RESEND_API_KEY);
				await resend.emails.send({
					from: 'HJ Engineering <noreply@hjengineering.com.au>',
					to: 'arthur@hjengineering.com.au',
					replyTo: email,
					subject: `Contact form: ${name}${company ? ` (${company})` : ''}`,
					text: [
						`Name: ${name}`,
						`Email: ${email}`,
						phone ? `Phone: ${phone}` : '',
						company ? `Company: ${company}` : '',
						'',
						'Message:',
						message
					]
						.filter(Boolean)
						.join('\n')
				});
			} else {
				console.log('--- Contact form submission ---');
				console.log({ name, email, phone, company, message });
				console.log('--- (no RESEND_API_KEY set, logged to console) ---');
			}
		} catch (err) {
			console.error('Failed to send contact email:', err);
			return fail(500, {
				error: 'Failed to send message. Please try emailing us directly.',
				values
			});
		}

		return { success: true };
	}
} satisfies Actions;
