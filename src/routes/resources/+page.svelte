<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
</script>

<SeoMeta
	title="Resources — HJ Engineering"
	description="Engineering resources, checklists, and guides for crane and lifting operations."
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hjengineering.com.au/" },
			{ "@type": "ListItem", "position": 2, "name": "Resources", "item": "https://hjengineering.com.au/resources" }
		]
	})}</script>`}
</svelte:head>

<!-- Hero -->
<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-center text-text-light">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">Resources</p>
	<h1 class="mx-auto mb-4 max-w-xl text-3xl font-bold">Engineering Resources</h1>
	<p class="mx-auto max-w-lg text-sm leading-relaxed text-text-faint">
		Checklists, guides, and reference material for crane and lifting operations.
	</p>
</section>

<section class="bg-bg-light px-8 py-16">
	<div class="mx-auto max-w-2xl text-center">
		<div class="rounded-lg border border-border bg-bg-subtle p-12">
			<p class="mb-2 text-lg font-bold text-text-dark">Coming Soon</p>
			<p class="text-sm text-text-muted">
				We're preparing downloadable resources including pre-lift checklists, engineering reference sheets, and industry guides. Check back soon.
			</p>
		</div>
	</div>
</section>
