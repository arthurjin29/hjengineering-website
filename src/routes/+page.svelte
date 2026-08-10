<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
</script>

<SeoMeta
	title="HJ Engineering — Specialist Crane & Lifting Engineering"
	description="Independent engineering consultancy for crane hire and construction companies across Australia. Lift planning, temporary works, ground assessment."
/>

<!-- Hero -->
<section
	class="relative overflow-hidden bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-text-light"
>
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.04]"
		style="background-image: repeating-linear-gradient(0deg, transparent, transparent 39px, #06b6d4 39px, #06b6d4 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #06b6d4 39px, #06b6d4 40px);"
	></div>
	<div class="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
		<div class="text-center lg:text-left">
			<p class="mb-4 text-xs uppercase tracking-[3px] text-primary">
				Independent Engineering Consultancy
			</p>
			<h1 class="mx-auto mb-4 max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight md:text-5xl lg:mx-0">
				Specialist Crane & Lifting Engineering for Australian Construction
			</h1>
			<p class="mx-auto mb-7 max-w-lg text-sm leading-relaxed text-text-faint lg:mx-0">
				Lift planning, temporary works, ground assessment, and engineering tools — backed by
				registered PE sign-off.
			</p>
			<div class="flex justify-center gap-3 lg:justify-start">
				<a
					href="/contact"
					class="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-bg-dark"
					>Get in Touch</a
				>
				<a
					href="/services"
					class="rounded-md border border-primary px-6 py-2.5 text-sm font-medium text-primary"
					>View Services</a
				>
			</div>
		</div>
		<figure class="m-0">
			<img
				src="/img/crane-digital-rehearsal.webp"
				alt="A crawler crane lifting a precast concrete segment on site, the right-hand half of the photograph dissolving into a white line model of the same machine, overlaid with drafting dimension lines."
				width="830"
				height="550"
				loading="eager"
				decoding="async"
				class="w-full"
			/>
			<figcaption class="mt-3 text-center text-xs text-text-faint lg:text-left">
				Every lift is rehearsed as a model before it is rehearsed on site.
			</figcaption>
		</figure>
	</div>
</section>

<!-- Credentials bar -->
<div class="flex flex-wrap justify-center gap-4 bg-primary-text px-8 py-3.5 text-center text-sm font-medium text-white md:gap-8">
	<span>PE · CPEng · NER · RPEQ</span>
	<span class="hidden md:inline">·</span>
	<span>ABN 34 695 221 768</span>
</div>

<!-- Services section -->
<section class="bg-bg-light px-8 py-12">
	<div class="mb-8 text-center">
		<p class="mb-2 text-xs uppercase tracking-[2px] text-primary-text">What We Do</p>
		<h2 class="text-2xl font-bold text-text-dark">Engineering Services</h2>
	</div>
	<div class="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
		{#each [
			{ name: 'Lifting & Crane Planning', desc: 'Crane lift plans, outrigger loads, lifting studies, complex lift support.', href: '/services/lifting-crane-planning' },
			{ name: 'Temporary Works', desc: 'Walkway checks, access platforms, temporary support, stability analysis.', href: '/services/temporary-works' },
			{ name: 'Ground & Bogmat Assessment', desc: 'Ground bearing pressure, bogmat verification, load spread analysis.', href: '/services/ground-bogmat-assessment' },
			{ name: 'Risk & Safety Engineering', desc: 'Hazard ID, risk assessment, engineering controls, safety reviews.', href: '/services/risk-safety-engineering' }
		] as service}
			<a href={service.href} class="group rounded-lg border-l-[3px] border-primary-text bg-bg-card p-5 transition-colors hover:bg-bg-subtle">
				<h3 class="mb-1.5 text-base font-semibold text-text-dark">{service.name}</h3>
				<p class="text-sm leading-relaxed text-text-muted">{service.desc}</p>
				<span class="mt-2 inline-block text-sm font-medium text-primary-text opacity-0 transition-opacity group-hover:opacity-100">Learn more →</span>
			</a>
		{/each}
	</div>
	<p class="mt-4 text-center text-xs text-text-muted">
		Work performed in accordance with relevant Australian Standards
	</p>
</section>

<!-- 4D planning capability -->
<section class="bg-bg-card px-8 py-12">
	<div class="mb-8 text-center">
		<p class="mb-2 text-xs uppercase tracking-[2px] text-primary-text">Digital Rehearsal</p>
		<h2 class="text-2xl font-bold text-text-dark">Planning in four dimensions</h2>
		<p class="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-text-body">
			Congested sites change week to week. Modelling the sequence — not just the lift — shows where
			the crane can stand, what blocks it, and when.
		</p>
	</div>
	<div class="mx-auto max-w-5xl overflow-x-auto">
		<img
			src="/img/4d-logistics.webp"
			alt="Three frames of the same modular construction site as it changes over seven weeks: a crawler crane setting precast headstocks on an open pad; the site at full density with modules, stacked materials and multiple cranes; and the completed accommodation building with the crane tracking out. Red arrows mark crane travel and material flow in each frame."
			width="1262"
			height="347"
			loading="lazy"
			decoding="async"
			class="w-full min-w-[600px] rounded-lg"
		/>
	</div>
</section>

<!-- Tools section -->
<section class="bg-bg-subtle px-8 py-12">
	<div class="mb-8 text-center">
		<p class="mb-2 text-xs uppercase tracking-[2px] text-primary-text">Engineering Tools</p>
		<h2 class="text-2xl font-bold text-text-dark">Free Online Tools</h2>
		<p class="mt-2 text-sm text-text-body">
			Purpose-built tools for crane and rigging professionals
		</p>
	</div>
	<div class="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		<a href="/tools/sling-calculator" class="group rounded-lg border border-border bg-bg-light p-6 transition-colors hover:border-primary-text">
			<div class="mb-3 text-primary-text"><svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v3"/><circle cx="12" cy="6.5" r="1.5"/><path d="M12 8 5 17M12 8l7 9"/><rect x="4" y="17" width="16" height="4" rx="1"/></svg></div>
			<h3 class="mb-1.5 text-base font-semibold text-text-dark">Sling Length Calculator</h3>
			<p class="mb-3 text-sm leading-relaxed text-text-muted">
				6 rigging configurations — calculates sling lengths, angles, and forces for multi-crane lifts.
			</p>
			<span class="text-sm font-medium text-primary-text">Open Tool →</span>
		</a>
		<a href="/tools/offset-beam-selector/index.html" class="group rounded-lg border border-border bg-bg-light p-6 transition-colors hover:border-primary-text">
			<div class="mb-3 text-primary-text"><svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v4"/><path d="M4 7h16"/><path d="M8 7v3M17 7v3"/><rect x="15" y="10" width="5" height="4" rx="1"/><path d="M8 10v9"/><rect x="5" y="19" width="6" height="2" rx="1"/></svg></div>
			<h3 class="mb-1.5 text-base font-semibold text-text-dark">Offset Beam Selector</h3>
			<p class="mb-3 text-sm leading-relaxed text-text-muted">
				Select a GTC or Maxirig offset lifting beam — counterweight position, rigging angles and load chart for an offset pick.
			</p>
			<span class="text-sm font-medium text-primary-text">Open Tool →</span>
		</a>
		<a href="/tools/dual-lift-calculator" class="group rounded-lg border border-border bg-bg-light p-6 transition-colors hover:border-primary-text">
			<div class="mb-3 text-primary-text"><svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v3M18 3v3"/><path d="M3 6.5h18"/><path d="M6 6.5 6 10M18 6.5 18 10"/><path d="M4 10h16"/><path d="M12 10v4"/><rect x="7" y="14" width="10" height="6" rx="1"/></svg></div>
			<h3 class="mb-1.5 text-base font-semibold text-text-dark">Dual-Lift Load Share</h3>
			<p class="mb-3 text-sm leading-relaxed text-text-muted">
				Per-crane load share for tandem lifts — dual lift &amp; place and rotation / tailing. AS 2550.1 §6.28 compliant.
			</p>
			<span class="text-sm font-medium text-primary-text">Open Tool →</span>
		</a>
		<a href="/tools/wind-calculator" class="group rounded-lg border border-border bg-bg-light p-6 transition-colors hover:border-primary-text">
			<div class="mb-3 text-primary-text"><svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 7h9a2.5 2.5 0 1 0-2.5-2.5"/><path d="M2 12h13a3 3 0 1 1-3 3"/><path d="M2 17h7"/><path d="M18 3v6"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M18 12v4"/></svg></div>
			<h3 class="mb-1.5 text-base font-semibold text-text-dark">Wind Load Calculator</h3>
			<p class="mb-3 text-sm leading-relaxed text-text-muted">
				AS 5222:2021 wind force on suspended loads, crane members, and out-of-service storm wind.
			</p>
			<span class="text-sm font-medium text-primary-text">Open Tool →</span>
		</a>
		<a href="/tools/access-map" class="group rounded-lg border border-border bg-bg-light p-6 transition-colors hover:border-primary-text">
			<div class="mb-3 text-primary-text"><svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg></div>
			<h3 class="mb-1.5 text-base font-semibold text-text-dark">NHVR Access Map</h3>
			<p class="mb-3 text-sm leading-relaxed text-text-muted">
				Plan crane transport routes with NHVR permit data, road restrictions, and turn analysis.
			</p>
			<span class="text-sm font-medium text-primary-text">Open Tool →</span>
		</a>
	</div>
</section>

<!-- CTA section -->
<section class="bg-bg-dark px-8 py-12 text-center text-text-light">
	<h2 class="mb-3 text-2xl font-bold">Need Engineering Support?</h2>
	<p class="mx-auto mb-6 max-w-md text-sm text-text-faint">
		Independent engineering consultancy for crane operations and temporary structures across
		Australia.
	</p>
	<a href="/contact" class="rounded-md bg-primary px-7 py-3 text-sm font-semibold text-bg-dark"
		>Get in Touch</a
	>
</section>
