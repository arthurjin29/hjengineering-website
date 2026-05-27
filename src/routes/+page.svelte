<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
</script>

<SeoMeta
	title="HJ Engineering — Specialist Crane & Lifting Engineering"
	description="Independent engineering consultancy for crane hire and construction companies across Australia. Lift planning, temporary works, ground assessment."
/>

<!-- Hero -->
<section
	class="relative bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-center text-text-light"
>
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.04]"
		style="background-image: repeating-linear-gradient(0deg, transparent, transparent 39px, #06b6d4 39px, #06b6d4 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #06b6d4 39px, #06b6d4 40px);"
	></div>
	<div class="relative z-10">
		<p class="mb-4 text-xs uppercase tracking-[3px] text-primary">
			Independent Engineering Consultancy
		</p>
		<h1 class="mx-auto mb-4 max-w-xl text-3xl font-bold leading-tight">
			Specialist Crane & Lifting Engineering for Australian Construction
		</h1>
		<p class="mx-auto mb-7 max-w-lg text-sm leading-relaxed text-text-faint">
			Lift planning, temporary works, ground assessment, and engineering tools — backed by
			registered PE sign-off.
		</p>
		<div class="flex justify-center gap-3">
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
</section>

<!-- Credentials bar -->
<div class="flex flex-wrap justify-center gap-4 bg-primary-text px-8 py-3.5 text-center text-sm font-medium text-white md:gap-8">
	<span>Registered Professional Engineer — PE0018121</span>
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
	<p class="mt-4 text-center text-xs text-text-faint">
		Work performed in accordance with relevant Australian Standards
	</p>
</section>

<!-- Tools section -->
<section class="bg-bg-subtle px-8 py-12">
	<div class="mb-8 text-center">
		<p class="mb-2 text-xs uppercase tracking-[2px] text-primary-text">Engineering Tools</p>
		<h2 class="text-2xl font-bold text-text-dark">Free Online Tools</h2>
		<p class="mt-2 text-sm text-text-muted">
			Purpose-built tools for crane and rigging professionals
		</p>
	</div>
	<div class="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		<a href="/tools/sling-calculator" class="group rounded-lg border border-border bg-bg-light p-6 transition-colors hover:border-primary-text">
			<div class="mb-2 text-2xl">📐</div>
			<h3 class="mb-1.5 text-base font-semibold text-text-dark">Sling Length Calculator</h3>
			<p class="mb-3 text-sm leading-relaxed text-text-muted">
				6 rigging configurations — calculates sling lengths, angles, and forces for multi-crane lifts.
			</p>
			<span class="text-sm font-medium text-primary-text">Open Tool →</span>
		</a>
		<a href="/tools/dual-lift-calculator" class="group rounded-lg border border-border bg-bg-light p-6 transition-colors hover:border-primary-text">
			<div class="mb-2 text-2xl">⚖️</div>
			<h3 class="mb-1.5 text-base font-semibold text-text-dark">Dual-Lift Load Share</h3>
			<p class="mb-3 text-sm leading-relaxed text-text-muted">
				Per-crane load share for tandem lifts — dual lift &amp; place and rotation / tailing. AS 2550.1 §6.28 compliant.
			</p>
			<span class="text-sm font-medium text-primary-text">Open Tool →</span>
		</a>
		<a href="/tools/wind-calculator" class="group rounded-lg border border-border bg-bg-light p-6 transition-colors hover:border-primary-text">
			<div class="mb-2 text-2xl">💨</div>
			<h3 class="mb-1.5 text-base font-semibold text-text-dark">Wind Load Calculator</h3>
			<p class="mb-3 text-sm leading-relaxed text-text-muted">
				AS 5222:2021 wind force on suspended loads, crane members, and out-of-service storm wind.
			</p>
			<span class="text-sm font-medium text-primary-text">Open Tool →</span>
		</a>
		<a href="/tools/access-map" class="group rounded-lg border border-border bg-bg-light p-6 transition-colors hover:border-primary-text">
			<div class="mb-2 text-2xl">🗺️</div>
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
