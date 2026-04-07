import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const site = 'https://hjengineering.com.au';

	const modules = import.meta.glob('/src/content/blog/*.md', { eager: true });

	const posts = Object.entries(modules)
		.map(([path, mod]) => {
			const slug = path.split('/').pop()!.replace('.md', '');
			const { title, date, description } = (mod as Record<string, unknown>).metadata as {
				title: string;
				date: string;
				description: string;
			};
			return { title, date, description, slug };
		})
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>HJ Engineering Blog</title>
  <subtitle>Engineering insights from HJ Engineering Consultants</subtitle>
  <link href="${site}/rss.xml" rel="self"/>
  <link href="${site}"/>
  <id>${site}/</id>
  <updated>${posts[0]?.date ? new Date(posts[0].date).toISOString() : new Date().toISOString()}</updated>
  <author><name>Arthur Jin</name></author>
${posts
	.map(
		(post) => `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${site}/blog/${post.slug}"/>
    <id>${site}/blog/${post.slug}</id>
    <published>${new Date(post.date).toISOString()}</published>
    <updated>${new Date(post.date).toISOString()}</updated>
    <summary>${escapeXml(post.description)}</summary>
  </entry>`
	)
	.join('\n')}
</feed>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/atom+xml' }
	});
};

function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
