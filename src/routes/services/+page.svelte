<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
	import { services } from '$lib/data/services';
</script>

<SeoMeta
	title="Engineering Services — HJ Engineering"
	description="Specialist crane and lifting engineering services: lift planning, temporary works, ground assessment, and risk engineering across Australia."
/>

<!-- Hero -->
<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-center text-text-light">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">Our Services</p>
	<h1 class="mx-auto mb-4 max-w-xl text-3xl font-bold">Engineering Services</h1>
	<p class="mx-auto max-w-lg text-sm leading-relaxed text-text-faint">
		Independent engineering consultancy for crane hire and construction companies. All work is PE-certified and performed in accordance with Australian Standards.
	</p>
</section>

<!-- Breadcrumb JSON-LD -->
<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hjengineering.com.au/" },
			{ "@type": "ListItem", "position": 2, "name": "Services", "item": "https://hjengineering.com.au/services" }
		]
	})}</script>`}
</svelte:head>

<!-- Services -->
<section class="bg-bg-light px-8 py-12">
	<div class="mx-auto max-w-3xl">
		{#each services as service, i}
			<div class="border-b border-border py-12 first:pt-0 last:border-b-0">
				<div class="mb-6">
					<h2 class="mb-2 text-2xl font-bold text-text-dark">{service.name}</h2>
					<p class="text-sm text-primary-text">{service.standards.join(' · ')}</p>
				</div>

				{#each service.description as paragraph}
					<p class="mb-4 text-sm leading-relaxed text-text-body">{paragraph}</p>
				{/each}

				<h3 class="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-text-dark">Deliverables</h3>
				<ul class="mb-6 grid grid-cols-1 gap-2 md:grid-cols-2">
					{#each service.deliverables as item}
						<li class="flex items-start gap-2 text-sm text-text-body">
							<span class="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-text"></span>
							{item}
						</li>
					{/each}
				</ul>

				<a
					href="/services/{service.slug}"
					class="text-sm font-medium text-primary-text transition-colors hover:text-primary-hover"
				>
					Learn more →
				</a>
			</div>
		{/each}
	</div>
</section>

<!-- CTA -->
<section class="bg-bg-dark px-8 py-12 text-center text-text-light">
	<h2 class="mb-3 text-2xl font-bold">Need Engineering Support?</h2>
	<p class="mx-auto mb-6 max-w-md text-sm text-text-faint">
		Get in touch to discuss your project requirements. All work is backed by registered PE sign-off.
	</p>
	<a href="/contact" class="rounded-md bg-primary px-7 py-3 text-sm font-semibold text-bg-dark">
		Get in Touch
	</a>
</section>
