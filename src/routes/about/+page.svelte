<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
</script>

<SeoMeta
	title="About — HJ Engineering"
	description="Independent engineering consultancy specialising in crane and lifting engineering for Australian construction."
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hjengineering.com.au/" },
			{ "@type": "ListItem", "position": 2, "name": "About", "item": "https://hjengineering.com.au/about" }
		]
	})}</script>`}
</svelte:head>

<!-- Hero -->
<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-center text-text-light">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">About Us</p>
	<h1 class="mx-auto mb-4 max-w-xl text-3xl font-bold">HJ Engineering Consultants</h1>
	<p class="mx-auto max-w-lg text-sm leading-relaxed text-text-faint">
		Independent engineering consultancy for crane and lifting operations across Australia.
	</p>
</section>

<!-- Bio section -->
<section class="bg-bg-light px-8 py-12">
	<div class="mx-auto grid max-w-4xl grid-cols-1 gap-12 md:grid-cols-5">
		<div class="md:col-span-3">
			<h2 class="mb-4 text-2xl font-bold text-text-dark">Background</h2>
			<p class="mb-4 text-sm leading-relaxed text-text-body">
				HJ Engineering Consultants is an independent engineering consultancy based in Melbourne, specialising in crane and lifting engineering for the Australian construction industry.
			</p>
			<p class="mb-4 text-sm leading-relaxed text-text-body">
				Founded by Arthur Jin, a Registered Professional Engineer, HJ Engineering provides lift planning, temporary works design, ground assessment, and risk engineering services to crane hire companies and construction contractors.
			</p>
			<p class="text-sm leading-relaxed text-text-body">
				We work directly with crane operators, riggers, and site teams to deliver practical, buildable engineering solutions — not just paperwork. Every deliverable is PE-certified and designed to be used on site.
			</p>
		</div>
		<div class="md:col-span-2">
			<div class="rounded-lg border border-border bg-bg-subtle p-6">
				<h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-dark">Credentials</h3>
				<dl class="space-y-3 text-sm">
					<div>
						<dt class="font-medium text-text-muted">Professional Engineer</dt>
						<dd class="font-mono text-text-dark">PE0018121</dd>
					</div>
					<div>
						<dt class="font-medium text-text-muted">ABN</dt>
						<dd class="font-mono text-text-dark">34 695 221 768</dd>
					</div>
					<div>
						<dt class="font-medium text-text-muted">Location</dt>
						<dd class="text-text-dark">Melbourne, Australia</dd>
					</div>
				</dl>
			</div>
		</div>
	</div>
</section>

<!-- Our Approach -->
<section class="bg-bg-subtle px-8 py-12">
	<div class="mx-auto max-w-3xl">
		<h2 class="mb-6 text-2xl font-bold text-text-dark">Our Approach</h2>
		<p class="mb-4 text-sm leading-relaxed text-text-body">
			We combine traditional engineering methods with modern computational tools to deliver faster, more accurate results. Purpose-built calculation tools and automated workflows let us focus engineering time on the decisions that matter — not the repetitive work.
		</p>
		<p class="mb-4 text-sm leading-relaxed text-text-body">
			Every project gets the same rigorous engineering review regardless of scale. From a single crane lift plan to a complex multi-crane tandem operation, the analysis depth matches the risk.
		</p>
		<p class="text-sm leading-relaxed text-text-body">
			We also build and maintain free online tools for the crane and rigging industry — including a sling length calculator and an NHVR access route planner — because better tools mean safer operations for everyone.
		</p>
	</div>
</section>

<!-- CTA -->
<section class="bg-bg-dark px-8 py-12 text-center text-text-light">
	<h2 class="mb-3 text-2xl font-bold">Work With Us</h2>
	<p class="mx-auto mb-6 max-w-md text-sm text-text-faint">
		Looking for independent engineering support? Get in touch to discuss your project.
	</p>
	<a href="/contact" class="rounded-md bg-primary px-7 py-3 text-sm font-semibold text-bg-dark">
		Get in Touch
	</a>
</section>
