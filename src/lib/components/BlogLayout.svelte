<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';

	let { title, date, description, children } = $props();

	let formattedDate = $derived(new Date(date).toLocaleDateString('en-AU', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}));
</script>

<SeoMeta
	title="{title} — HJ Engineering Blog"
	{description}
	ogUrl="https://hjengineering.com.au/blog"
	type="article"
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		"headline": title,
		"description": description,
		"datePublished": date,
		"author": {
			"@type": "Person",
			"name": "Arthur Jin"
		},
		"publisher": {
			"@type": "Organization",
			"name": "HJ Engineering Consultants"
		}
	})}</script>`}
</svelte:head>

<article class="bg-bg-light px-8 py-12">
	<div class="mx-auto max-w-3xl">
		<header class="mb-8 border-b border-border pb-8">
			<p class="mb-2 text-xs uppercase tracking-[2px] text-primary-text">Blog</p>
			<h1 class="mb-3 text-3xl font-bold text-text-dark">{title}</h1>
			<time class="text-sm text-text-muted" datetime={date}>{formattedDate}</time>
		</header>

		<div class="prose">
			{@render children()}
		</div>

		<footer class="mt-12 border-t border-border pt-8">
			<a
				href="/blog"
				class="text-sm font-medium text-primary-text transition-colors hover:text-primary-hover"
			>
				← Back to blog
			</a>
		</footer>
	</div>
</article>
