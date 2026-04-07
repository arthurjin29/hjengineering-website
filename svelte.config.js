import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';
import { relative, sep, resolve } from 'node:path';
import { createHighlighter } from 'shiki';

const highlighter = await createHighlighter({
	themes: ['github-dark'],
	langs: ['javascript', 'typescript', 'bash', 'json', 'html', 'css', 'python', 'rust', 'svelte']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// defaults to rune mode for the project, except for `node_modules`. Can be removed in svelte 6.
		runes: ({ filename }) => {
			const relativePath = relative(import.meta.dirname, filename);
			const pathSegments = relativePath.toLowerCase().split(sep);
			const isExternalLibrary = pathSegments.includes('node_modules');
			const isMdsvex = filename?.endsWith('.md') || filename?.endsWith('.svx');

			if (isMdsvex) return false;
			return isExternalLibrary ? undefined : true;
		}
	},
	kit: { adapter: adapter() },
	preprocess: [
		mdsvex({
			extensions: ['.svx', '.md'],
			highlight: {
				highlighter: async (code, lang) => {
					const html = highlighter.codeToHtml(code, { lang: lang || 'text', theme: 'github-dark' });
					return `{@html \`${html.replace(/`/g, '\\`')}\`}`;
				}
			},
			layout: {
				_: resolve(import.meta.dirname, 'src/lib/components/BlogLayout.svelte')
			}
		})
	],
	extensions: ['.svelte', '.svx', '.md']
};

export default config;
