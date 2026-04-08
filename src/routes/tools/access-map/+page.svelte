<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
</script>

<SeoMeta
	title="NHVR Access Map — HJ Engineering"
	description="Plan crane transport routes across Australia using NHVR gazetted heavy vehicle network data, permits, and road restrictions."
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hjengineering.com.au/" },
			{ "@type": "ListItem", "position": 2, "name": "NHVR Access Map", "item": "https://hjengineering.com.au/tools/access-map" }
		]
	})}</script>`}
</svelte:head>

<!-- Hero -->
<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-center text-text-light">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">Engineering Tools</p>
	<h1 class="mx-auto mb-3 max-w-xl text-3xl font-bold">NHVR Access Map</h1>
	<p class="mx-auto max-w-lg text-sm leading-relaxed text-text-faint">
		Plan crane transport routes across Australia using the NHVR gazetted heavy vehicle network. Check road access, permits, and restrictions before mobilisation.
	</p>
</section>

<section class="bg-bg-light px-8 py-12">
	<div class="mx-auto max-w-4xl">

		<!-- Status badge -->
		<div class="mb-8 flex items-center justify-center">
			<span class="rounded-full border border-yellow-300 bg-yellow-50 px-4 py-1.5 text-xs font-semibold text-yellow-800">
				Coming Soon — Currently in internal testing
			</span>
		</div>

		<!-- Feature grid -->
		<div class="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
			<div class="rounded-lg border border-border bg-bg-subtle p-6">
				<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-text/10">
					<svg class="h-5 w-5 text-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
					</svg>
				</div>
				<h3 class="mb-1.5 text-sm font-semibold text-text-dark">NHVR Network Data</h3>
				<p class="text-xs leading-relaxed text-text-muted">
					Full gazetted heavy vehicle road network with access restrictions by vehicle class. Covers multi-axle crane carriers and permit routes.
				</p>
			</div>

			<div class="rounded-lg border border-border bg-bg-subtle p-6">
				<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-text/10">
					<svg class="h-5 w-5 text-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
				</div>
				<h3 class="mb-1.5 text-sm font-semibold text-text-dark">Route Planning</h3>
				<p class="text-xs leading-relaxed text-text-muted">
					Plan A-to-B mobilisation routes with waypoint support. See which roads are accessible for your crane class before you leave the yard.
				</p>
			</div>

			<div class="rounded-lg border border-border bg-bg-subtle p-6">
				<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-text/10">
					<svg class="h-5 w-5 text-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<h3 class="mb-1.5 text-sm font-semibold text-text-dark">Permit Management</h3>
				<p class="text-xs leading-relaxed text-text-muted">
					Upload and manage crane transport permits. Filter routes by crane class — 3-axle through 8-axle carriers with GVM/GCM restrictions.
				</p>
			</div>

			<div class="rounded-lg border border-border bg-bg-subtle p-6">
				<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-text/10">
					<svg class="h-5 w-5 text-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</div>
				<h3 class="mb-1.5 text-sm font-semibold text-text-dark">Interactive Map</h3>
				<p class="text-xs leading-relaxed text-text-muted">
					Leaflet-based map with satellite/street views, address search, and click-to-identify road segments. Visual overlay of restricted and permitted routes.
				</p>
			</div>
		</div>

		<!-- Crane classes -->
		<div class="mb-12">
			<h2 class="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-text-dark">Supported Crane Classes</h2>
			<div class="flex flex-wrap justify-center gap-3">
				{#each ['3-Axle', '4-Axle', '5-Axle', '6-Axle', '7-Axle', '8-Axle'] as cls}
					<span class="rounded-md border border-border bg-bg-subtle px-4 py-2 text-xs font-medium text-text-dark">{cls} Carrier</span>
				{/each}
			</div>
		</div>

		<!-- CTA -->
		<div class="rounded-lg border border-border bg-bg-subtle p-8 text-center">
			<h2 class="mb-2 text-lg font-semibold text-text-dark">Interested in early access?</h2>
			<p class="mb-6 text-sm text-text-muted">
				The NHVR Access Map is currently in internal testing with select crane companies in Victoria. We're planning a broader rollout across Australian states.
			</p>
			<a
				href="/contact"
				class="inline-block rounded-md bg-primary-text px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
			>
				Register Interest
			</a>
		</div>
	</div>
</section>
