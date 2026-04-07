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
		return await store.sismember('whitelist', email.toLowerCase()) === 1;
	}
	if (!memoryWhitelist) memoryWhitelist = getInitialWhitelist();
	return memoryWhitelist.has(email.toLowerCase());
}

export async function isAdmin(email: string): Promise<boolean> {
	const store = await getKv();
	if (store) {
		return await store.sismember('admins', email.toLowerCase()) === 1;
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
