import { env } from '$env/dynamic/private';
import { createClient, type RedisClientType } from 'redis';

/**
 * Shared Redis connection.
 *
 * The store Vercel provisions for this project is Redis Cloud, which exposes
 * the Redis wire protocol via `REDIS_URL` rather than the REST API that
 * `@vercel/kv` expects — so the client here is `node-redis`, not `kv`.
 *
 * The connection is created once per warm serverless instance and reused.
 * Reconnecting on every request would add a TCP and TLS handshake to each
 * one, and Redis Cloud's free tier caps concurrent connections, so a
 * per-request client would exhaust it under any real traffic.
 *
 * Every consumer must tolerate `null`: with no `REDIS_URL` the callers fall
 * back to in-memory state, which is what makes local development and the
 * test suite work without a database.
 */
let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;

// After a failed connect, skip Redis for this long rather than paying the
// connect timeout on every request.
const RETRY_AFTER_MS = 60_000;
let failedAt = 0;

async function connect(): Promise<RedisClientType | null> {
	if (!env.REDIS_URL) return null;
	if (Date.now() - failedAt < RETRY_AFTER_MS) return null;

	// A store that no longer exists used to leave every caller waiting on
	// endless reconnects, which hung the contact form until the function
	// timed out. Fail fast instead and let callers use their in-memory
	// fallback: the whitelist's is deny-by-default, so access does not widen.
	const c: RedisClientType = createClient({
		url: env.REDIS_URL,
		socket: { connectTimeout: 3000, reconnectStrategy: false }
	});

	// Without a listener, node-redis treats a connection error as an
	// unhandled 'error' event and takes the whole function down. Access
	// control degrading to its in-memory fallback is bad; the process
	// dying on a transient network blip is worse.
	c.on('error', (err) => console.error('redis:', err?.message ?? err));

	try {
		await c.connect();
	} catch (err) {
		console.error('redis: connect failed, using in-memory fallback:', (err as Error)?.message ?? err);
		failedAt = Date.now();
		// A client whose first connect failed is already closed, and
		// destroying it again throws.
		if (c.isOpen) c.destroy();
		return null;
	}
	client = c;
	return c;
}

export async function getRedis(): Promise<RedisClientType | null> {
	if (client?.isOpen) return client;
	// Collapse concurrent callers onto one connect: a cold start that
	// handles several requests at once would otherwise open several
	// connections and keep only the last.
	if (!connecting) {
		connecting = connect().finally(() => {
			connecting = null;
		});
	}
	return connecting;
}
