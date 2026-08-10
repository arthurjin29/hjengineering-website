<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let service = $derived(data.service);
</script>

<SeoMeta title="{service.name} — HJ Engineering" description={service.tagline} />

<!-- Breadcrumb JSON-LD -->
<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hjengineering.com.au/" },
			{ "@type": "ListItem", "position": 2, "name": "Services", "item": "https://hjengineering.com.au/services" },
			{ "@type": "ListItem", "position": 3, "name": service.name, "item": `https://hjengineering.com.au/services/${service.slug}` }
		]
	})}</script>`}
</svelte:head>

<!-- Hero -->
<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-center text-text-light">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">Engineering Services</p>
	<h1 class="mx-auto mb-4 max-w-xl text-3xl font-bold">{service.name}</h1>
	<p class="mx-auto max-w-lg text-sm leading-relaxed text-text-faint">{service.tagline}</p>
</section>

<!-- Content -->
<section class="bg-bg-light px-8 py-12">
	<div class="mx-auto max-w-3xl">
		{#each service.description as paragraph}
			<p class="mb-4 text-sm leading-relaxed text-text-body">{paragraph}</p>
		{/each}

		<h2 class="mb-4 mt-8 text-lg font-bold text-text-dark">Deliverables</h2>
		<ul class="mb-8 space-y-2">
			{#each service.deliverables as item}
				<li class="flex items-start gap-2 text-sm text-text-body">
					<span class="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-text"></span>
					{item}
				</li>
			{/each}
		</ul>

		<h2 class="mb-3 text-lg font-bold text-text-dark">Applicable Standards</h2>
		<div class="mb-8 flex flex-wrap gap-2">
			{#each service.standards as std}
				<span class="rounded-md bg-bg-subtle px-3 py-1 font-mono text-xs text-text-muted">{std}</span>
			{/each}
		</div>

		<div class="rounded-lg border border-border bg-bg-subtle p-6 text-center">
			<p class="mb-4 text-sm text-text-body">
				Need {service.name.toLowerCase()} support for your project?
			</p>
			<a
				href="/contact"
				class="inline-block rounded-md bg-primary-text px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
			>
				Get in Touch
			</a>
		</div>
	</div>
</section>
