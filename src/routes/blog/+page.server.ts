import type { PageServerLoad } from './$types';

interface PostMeta {
	title: string;
	date: string;
	description: string;
	slug: string;
}

export const load: PageServerLoad = async () => {
	const modules = import.meta.glob('/src/content/blog/*.md', { eager: true });

	const posts: PostMeta[] = Object.entries(modules)
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

	return { posts };
};
