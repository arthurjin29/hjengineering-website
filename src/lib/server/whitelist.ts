import { env } from '$env/dynamic/private';

// In production, uses Vercel KV. In dev without KV, falls back to in-memory Set.
let memoryWhitelist: Set<string> | null = null;
let memoryAdmins: Set<string> | null = null;

function getInitialAdmins(): Set<string> {
	return new Set(['arthur@hjengineering.com.au']);
}

function getInitialWhitelist(): Set<string> {
	return new Set(['arthur@hjengineering.com.au']);
}

async function getKv() {
	if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return null;
	const { kv } = await import('@vercel/kv');
	return kv;
}

export async function isWhitelisted(email: string): Promise<boolean> {
	const store = await getKv();
	if (store) {
		return (await store.sismember('whitelist', email.toLowerCase())) === 1;
	}
	if (!memoryWhitelist) memoryWhitelist = getInitialWhitelist();
	return memoryWhitelist.has(email.toLowerCase());
}

export async function isAdmin(email: string): Promise<boolean> {
	const store = await getKv();
	if (store) {
		return (await store.sismember('admins', email.toLowerCase())) === 1;
	}
	if (!memoryAdmins) memoryAdmins = getInitialAdmins();
	return memoryAdmins.has(email.toLowerCase());
}

export async function getWhitelist(): Promise<string[]> {
	const store = await getKv();
	if (store) {
		return await store.smembers('whitelist');
	}
	if (!memoryWhitelist) memoryWhitelist = getInitialWhitelist();
	return [...memoryWhitelist];
}

export async function addToWhitelist(email: string): Promise<void> {
	const store = await getKv();
	if (store) {
		await store.sadd('whitelist', email.toLowerCase());
		return;
	}
	if (!memoryWhitelist) memoryWhitelist = getInitialWhitelist();
	memoryWhitelist.add(email.toLowerCase());
}

export async function removeFromWhitelist(email: string): Promise<void> {
	const store = await getKv();
	if (store) {
		await store.srem('whitelist', email.toLowerCase());
		return;
	}
	if (!memoryWhitelist) memoryWhitelist = getInitialWhitelist();
	memoryWhitelist.delete(email.toLowerCase());
}

/**
 * Pending access requests.
 *
 * Someone signing in with Google who is not on the whitelist used to be
 * bounced with a bare `AccessDenied` and no trace, so the only way to grant
 * access was to already know the address and add it in advance. Recording
 * the attempt turns that dead end into a queue the admin page can work
 * through.
 *
 * Stored as a hash rather than a set so the request keeps the name Google
 * supplied and the time it was made — an email alone does not tell you who
 * asked or whether it is still current.
 */
const PENDING = 'pending';

// A request can be created by anyone with a Google account, so the queue is
// bounded. Past this many entries new requests are dropped rather than
// letting an unbounded list accumulate; the cap is far above any real
// number of colleagues and clients.
const MAX_PENDING = 200;

export interface AccessRequest {
	email: string;
	name: string | null;
	requestedAt: string;
}

let memoryPending: Map<string, AccessRequest> | null = null;

function pendingMemory(): Map<string, AccessRequest> {
	if (!memoryPending) memoryPending = new Map();
	return memoryPending;
}

/** Record an access request. No-op if already whitelisted or already queued. */
export async function requestAccess(email: string, name?: string | null): Promise<void> {
	const key = email.toLowerCase();
	if (await isWhitelisted(key)) return;

	const entry: AccessRequest = {
		email: key,
		name: name ?? null,
		requestedAt: new Date().toISOString()
	};

	const store = await getKv();
	if (store) {
		// Re-requesting must not refresh the timestamp: the age of the
		// oldest attempt is what says how long someone has been waiting.
		if (await store.hget(PENDING, key)) return;
		if ((await store.hlen(PENDING)) >= MAX_PENDING) return;
		await store.hset(PENDING, { [key]: entry });
		return;
	}
	const mem = pendingMemory();
	if (mem.has(key) || mem.size >= MAX_PENDING) return;
	mem.set(key, entry);
}

export async function getPendingRequests(): Promise<AccessRequest[]> {
	const store = await getKv();
	const entries = store
		? Object.values((await store.hgetall<Record<string, AccessRequest>>(PENDING)) ?? {})
		: [...pendingMemory().values()];
	// Oldest first — the person who has waited longest is the one to action.
	return entries.sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}

export async function clearRequest(email: string): Promise<void> {
	const key = email.toLowerCase();
	const store = await getKv();
	if (store) {
		await store.hdel(PENDING, key);
		return;
	}
	pendingMemory().delete(key);
}

/** Approve a request: whitelist the address, then drop it from the queue. */
export async function approveRequest(email: string): Promise<void> {
	await addToWhitelist(email);
	await clearRequest(email);
}
