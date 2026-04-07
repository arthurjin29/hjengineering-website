<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SeoMeta
	title="Blog — HJ Engineering"
	description="Engineering insights, AI in construction, and case studies from HJ Engineering Consultants."
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hjengineering.com.au/" },
			{ "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://hjengineering.com.au/blog" }
		]
	})}</script>`}
</svelte:head>

<!-- Hero -->
<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-center text-text-light">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">Blog</p>
	<h1 class="mx-auto mb-4 max-w-xl text-3xl font-bold">Engineering Insights</h1>
	<p class="mx-auto max-w-lg text-sm leading-relaxed text-text-faint">
		Notes on crane engineering, construction technology, and tools we're building.
	</p>
</section>

<section class="bg-bg-light px-8 py-12">
	<div class="mx-auto max-w-3xl">
		{#if data.posts.length === 0}
			<div class="rounded-lg border border-border bg-bg-subtle p-12 text-center">
				<p class="text-sm text-text-muted">No posts yet. Check back soon.</p>
			</div>
		{:else}
			<div class="space-y-8">
				{#each data.posts as post}
					<a href="/blog/{post.slug}" class="group block rounded-lg border border-border p-6 transition-colors hover:border-primary-text">
						<time class="text-xs text-text-muted" datetime={post.date}>
							{new Date(post.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
						</time>
						<h2 class="mt-1 text-lg font-bold text-text-dark group-hover:text-primary-text">{post.title}</h2>
						<p class="mt-2 text-sm leading-relaxed text-text-body">{post.description}</p>
						<span class="mt-3 inline-block text-sm font-medium text-primary-text">Read more →</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
