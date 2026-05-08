import type { RequestHandler } from './$types';
import { services } from '$lib/data/services';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const site = 'https://hjengineering.com.au';

	const staticPages = [
		'',
		'/services',
		'/about',
		'/contact',
		'/resources',
		'/blog',
		'/tools/sling-calculator',
		'/tools/wind-calculator'
	];

	const servicePages = services.map((s) => `/services/${s.slug}`);

	// Blog posts
	const modules = import.meta.glob('/src/content/blog/*.md', { eager: true });
	const blogPages = Object.keys(modules).map(
		(path) => `/blog/${path.split('/').pop()!.replace('.md', '')}`
	);

	const allPages = [...staticPages, ...servicePages, ...blogPages];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map((page) => `  <url><loc>${site}${page}</loc></url>`).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
