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

async function connect(): Promise<RedisClientType | null> {
	if (!env.REDIS_URL) return null;

	const c: RedisClientType = createClient({ url: env.REDIS_URL });

	// Without a listener, node-redis treats a connection error as an
	// unhandled 'error' event and takes the whole function down. Access
	// control degrading to its in-memory fallback is bad; the process
	// dying on a transient network blip is worse.
	c.on('error', (err) => console.error('redis:', err?.message ?? err));

	await c.connect();
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
