import * as Sentry from '@sentry/sveltekit';

if (typeof window !== 'undefined' && import.meta.env.VITE_SENTRY_DSN) {
	Sentry.init({
		dsn: import.meta.env.VITE_SENTRY_DSN,
		tracesSampleRate: 0.1,
		environment: import.meta.env.MODE
	});
}

export const handleError = Sentry.handleErrorWithSentry();
