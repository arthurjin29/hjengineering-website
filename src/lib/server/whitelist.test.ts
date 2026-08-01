import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Exercises the in-memory fallback, which is what runs without KV
 * credentials. The KV path is the same logic against a different store; what
 * is worth pinning here is the queue's semantics, because each rule below
 * exists to prevent a specific wrong behaviour rather than to describe the
 * implementation.
 */
vi.mock('$env/dynamic/private', () => ({ env: {} }));

async function fresh() {
	vi.resetModules();
	return await import('./whitelist');
}

describe('access request queue', () => {
	let wl: Awaited<ReturnType<typeof fresh>>;

	beforeEach(async () => {
		wl = await fresh();
	});

	it('records a request from an unknown address', async () => {
		await wl.requestAccess('new@example.com', 'New Person');
		const pending = await wl.getPendingRequests();
		expect(pending).toHaveLength(1);
		expect(pending[0].email).toBe('new@example.com');
		expect(pending[0].name).toBe('New Person');
	});

	it('does not queue someone who is already approved', async () => {
		// The seeded admin is whitelisted from the start.
		await wl.requestAccess('arthur@hjengineering.com.au');
		expect(await wl.getPendingRequests()).toHaveLength(0);
	});

	it('lower-cases the address so one person cannot queue twice', async () => {
		await wl.requestAccess('Mixed@Example.com');
		await wl.requestAccess('mixed@example.com');
		const pending = await wl.getPendingRequests();
		expect(pending).toHaveLength(1);
		expect(pending[0].email).toBe('mixed@example.com');
	});

	it('keeps the original timestamp when someone signs in again', async () => {
		await wl.requestAccess('waiting@example.com');
		const first = (await wl.getPendingRequests())[0].requestedAt;
		await new Promise((r) => setTimeout(r, 5));
		await wl.requestAccess('waiting@example.com');
		// How long someone has been waiting is the point of the timestamp; a
		// second sign-in must not reset it and send them to the back.
		expect((await wl.getPendingRequests())[0].requestedAt).toBe(first);
	});

	it('returns the longest wait first', async () => {
		await wl.requestAccess('first@example.com');
		await new Promise((r) => setTimeout(r, 5));
		await wl.requestAccess('second@example.com');
		const pending = await wl.getPendingRequests();
		expect(pending.map((p) => p.email)).toEqual(['first@example.com', 'second@example.com']);
	});

	it('approving whitelists the address and clears the request', async () => {
		await wl.requestAccess('approve@example.com');
		await wl.approveRequest('approve@example.com');
		expect(await wl.isWhitelisted('approve@example.com')).toBe(true);
		expect(await wl.getPendingRequests()).toHaveLength(0);
	});

	it('dismissing clears the request without whitelisting', async () => {
		await wl.requestAccess('deny@example.com');
		await wl.clearRequest('deny@example.com');
		expect(await wl.isWhitelisted('deny@example.com')).toBe(false);
		expect(await wl.getPendingRequests()).toHaveLength(0);
	});

	it('lets a dismissed person ask again', async () => {
		// Dismissing is not a block. A mistaken dismissal should be
		// recoverable by the person simply signing in again.
		await wl.requestAccess('again@example.com');
		await wl.clearRequest('again@example.com');
		await wl.requestAccess('again@example.com');
		expect(await wl.getPendingRequests()).toHaveLength(1);
	});

	it('bounds the queue so anyone with a Google account cannot grow it forever', async () => {
		for (let i = 0; i < 205; i++) {
			await wl.requestAccess(`bulk${i}@example.com`);
		}
		expect((await wl.getPendingRequests()).length).toBe(200);
	});

	it('does not leave an approved address in the queue', async () => {
		await wl.requestAccess('both@example.com');
		await wl.approveRequest('both@example.com');
		await wl.requestAccess('both@example.com');
		// Already whitelisted, so the second attempt is a no-op rather than
		// re-queueing someone who already has access.
		expect(await wl.getPendingRequests()).toHaveLength(0);
	});
});
