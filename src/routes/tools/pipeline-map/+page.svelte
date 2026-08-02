<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>SE Australian Sustainable AI Construction — HJ Engineering</title>
	<!-- Gated content: never index it, and never follow through to the map. -->
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- Hero -->
<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-center text-text-light">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">Internal Tools</p>
	<h1 class="mx-auto mb-3 max-w-xl text-3xl font-bold">SE Australian Sustainable AI Construction</h1>
	<p class="mx-auto max-w-lg text-sm leading-relaxed text-text-faint">
		Wind, transmission, BESS and data-centre projects across south-east Australia —
		what is being built, where, and at what stage.
	</p>
</section>

<section class="bg-bg-light px-8 py-12">
	<div class="mx-auto max-w-3xl">
		<div class="mb-8 flex items-center justify-center">
			<span
				class="rounded-full border border-green-300 bg-green-50 px-4 py-1.5 text-xs font-semibold text-green-800"
			>
				Restricted — signed in as {data.email}
			</span>
		</div>

		{#if data.meta}
			<dl class="mb-8 grid grid-cols-3 gap-4 text-center">
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<dt class="text-xs uppercase tracking-wide text-gray-500">Projects</dt>
					<dd class="mt-1 text-2xl font-bold">{data.meta.projects}</dd>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<dt class="text-xs uppercase tracking-wide text-gray-500">Published</dt>
					<dd class="mt-1 text-2xl font-bold">{data.meta.published}</dd>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<dt class="text-xs uppercase tracking-wide text-gray-500">Withheld</dt>
					<dd class="mt-1 text-2xl font-bold">{data.meta.withheld}</dd>
				</div>
			</dl>
		{/if}

		<div class="mb-10 text-center">
			<a
				href="/tools/pipeline-map/view"
				class="inline-block rounded-lg bg-primary px-8 py-3 font-semibold text-white transition hover:opacity-90"
			>
				Open the map
			</a>
		</div>

		<div class="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
			<p class="mb-2 font-semibold">What this map does and does not show</p>
			<p class="mb-2">
				Rows are drawn from public announcements and public registers. Head contractors,
				our approach status, and any project sourced from a subscription platform or a
				document issued to us in confidence are all excluded — those stay in the internal
				build and never leave the office machine.
			</p>
			<p>
				It answers what is being built and where. It is not a crane capability
				assessment, and a marker is not a statement that a project is winnable.
			</p>
		</div>
	</div>
</section>
