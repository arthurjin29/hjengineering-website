import { getRedis } from './redis';

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

// In-memory fallback for dev
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
	const key = `rate:contact:${ip}`;

	// Shared store in production, so the limit holds across serverless
	// instances. On the in-memory fallback each instance counts separately,
	// so the effective limit is multiplied by however many are warm.
	const store = await getRedis();
	if (store) {
		const current = await store.incr(key);
		if (current === 1) {
			await store.pExpire(key, WINDOW_MS);
		}
		const remaining = Math.max(0, MAX_REQUESTS - current);
		return { allowed: current <= MAX_REQUESTS, remaining };
	}

	// In-memory fallback
	const now = Date.now();
	const entry = memoryStore.get(key);

	if (!entry || now > entry.resetAt) {
		memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return { allowed: true, remaining: MAX_REQUESTS - 1 };
	}

	entry.count++;
	const remaining = Math.max(0, MAX_REQUESTS - entry.count);
	return { allowed: entry.count <= MAX_REQUESTS, remaining };
}
