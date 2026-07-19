<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
	import SlingDiagram from '$lib/sling-calc/SlingDiagram.svelte';
	import { calculate, CONFIG_LABELS, type ConfigType, type CalcResult, type SharedInputs, type ConfigInputs } from '$lib/sling-calc';

	let SlingScene3D: typeof import('$lib/sling-calc/SlingScene3D.svelte').default | null = $state(null);
	import('$lib/sling-calc/SlingScene3D.svelte').then(m => { SlingScene3D = m.default; });

	let configType: ConfigType = $state('direct');
	let error: string = $state('');
	let results: CalcResult | null = $state(null);

	// Shared inputs
	let lp1 = $state({ x: -3, y: -1.5, z: 0 });
	let lp2 = $state({ x: 3, y: -1.5, z: 0 });
	let lp3 = $state({ x: 3, y: 1.5, z: 0 });
	let lp4 = $state({ x: -3, y: 1.5, z: 0 });
	let cogX = $state(0);
	let cogY = $state(0);
	let cogZ = $state(0);
	let minAngle = $state(60);
	let totalLoad = $state(10);

	// Config-specific inputs
	let beamLength = $state(4);
	let orientation = $state('lengthwise');
	let topSlingLength = $state(0);
	let beamLengthA = $state(2);
	let beamLengthB = $state(2);
	let masterLength = $state(4);
	let slaveLengthA = $state(2);
	let slaveLengthB = $state(2);
	let bottomSlingLen = $state(2);

	function runCalculation() {
		error = '';
		results = null;

		const shared: SharedInputs = {
			liftingPoints: [
				{ x: lp1.x, y: lp1.y, z: lp1.z },
				{ x: lp2.x, y: lp2.y, z: lp2.z },
				{ x: lp3.x, y: lp3.y, z: lp3.z },
				{ x: lp4.x, y: lp4.y, z: lp4.z }
			],
			cog: { x: cogX, y: cogY, z: cogZ },
			minAngleDeg: minAngle,
			totalLoad
		};

		const config: ConfigInputs = {};
		if (configType === 'spreader-beam' || configType === 'lifting-beam') {
			config.beamLength = beamLength;
			config.orientation = orientation as 'lengthwise' | 'widthwise';
			config.bottomSlingLen = bottomSlingLen;
		} else if (configType === 'stinger') {
			config.topSlingLength = topSlingLength;
		} else if (configType === 'double-parallel') {
			config.beamLengthA = beamLengthA;
			config.beamLengthB = beamLengthB;
			config.bottomSlingLen = bottomSlingLen;
		} else if (configType === 'double-cascade') {
			config.masterLength = masterLength;
			config.slaveLengthA = slaveLengthA;
			config.slaveLengthB = slaveLengthB;
			config.bottomSlingLen = bottomSlingLen;
		}

		try {
			results = calculate(configType, shared, config);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Calculation failed';
		}
	}

	const configTypes = Object.entries(CONFIG_LABELS) as [ConfigType, string][];
</script>

<SeoMeta
	title="Sling Length Calculator — HJ Engineering"
	description="Free online sling length calculator. 6 rigging configurations — calculates sling lengths, angles, tensions, and hook height."
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hjengineering.com.au/" },
			{ "@type": "ListItem", "position": 2, "name": "Sling Calculator", "item": "https://hjengineering.com.au/tools/sling-calculator" }
		]
	})}</script>`}
</svelte:head>

<!-- Hero -->
<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-12 text-center text-text-light">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">Engineering Tools</p>
	<h1 class="mx-auto mb-3 max-w-xl text-3xl font-bold">Sling Length Calculator</h1>
	<p class="mx-auto max-w-lg text-sm leading-relaxed text-text-faint">
		Calculate sling lengths, angles, tensions, and hook height for 6 rigging configurations. All calculations run in your browser.
	</p>
</section>

<section class="bg-bg-light px-8 py-8">
	<div class="mx-auto max-w-4xl">
		<!-- Config selector -->
		<div class="mb-6">
			<label for="config-type" class="mb-1 block text-sm font-medium text-text-dark">Configuration</label>
			<select
				id="config-type"
				bind:value={configType}
				class="w-full rounded-md border border-border bg-bg-light px-3 py-2 text-sm text-text-dark focus:border-primary-text focus:outline-none focus:ring-1 focus:ring-primary-text"
			>
				{#each configTypes as [key, label]}
					<option value={key}>{label}</option>
				{/each}
			</select>
		</div>

		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Inputs -->
			<div>
				<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-dark">Lifting Points (m)</h2>
				<div class="mb-6 space-y-3">
					{#each [
						{ label: 'LP1', point: lp1 },
						{ label: 'LP2', point: lp2 },
						{ label: 'LP3', point: lp3 },
						{ label: 'LP4', point: lp4 }
					] as { label, point }}
						<div class="flex items-center gap-2">
							<span class="w-8 text-xs font-medium text-text-muted">{label}</span>
							<label class="sr-only" for="{label}-x">X</label>
							<input id="{label}-x" type="number" step="0.1" bind:value={point.x} placeholder="X"
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
							<label class="sr-only" for="{label}-y">Y</label>
							<input id="{label}-y" type="number" step="0.1" bind:value={point.y} placeholder="Y"
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
							<label class="sr-only" for="{label}-z">Z</label>
							<input id="{label}-z" type="number" step="0.1" bind:value={point.z} placeholder="Z"
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
					{/each}
				</div>

				<div class="mb-4 grid grid-cols-3 gap-3">
					<div>
						<label for="cog-x" class="mb-1 block text-xs font-medium text-text-muted">COG X</label>
						<input id="cog-x" type="number" step="0.1" bind:value={cogX}
							class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
					</div>
					<div>
						<label for="cog-y" class="mb-1 block text-xs font-medium text-text-muted">COG Y</label>
						<input id="cog-y" type="number" step="0.1" bind:value={cogY}
							class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
					</div>
					<div>
						<label for="cog-z" class="mb-1 block text-xs font-medium text-text-muted">COG Z</label>
						<input id="cog-z" type="number" step="0.1" bind:value={cogZ}
							class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
					</div>
				</div>

				<div class="mb-4 grid grid-cols-2 gap-3">
					<div>
						<label for="min-angle" class="mb-1 block text-xs font-medium text-text-muted">Min Angle (deg)</label>
						<input id="min-angle" type="number" step="1" min="1" max="89" bind:value={minAngle}
							class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
					</div>
					<div>
						<label for="total-load" class="mb-1 block text-xs font-medium text-text-muted">Total Load (t)</label>
						<input id="total-load" type="number" step="0.1" min="0.1" bind:value={totalLoad}
							class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
					</div>
				</div>

				<!-- Config-specific inputs -->
				{#if configType === 'spreader-beam' || configType === 'lifting-beam'}
					<div class="mb-4 grid grid-cols-3 gap-3">
						<div>
							<label for="beam-length" class="mb-1 block text-xs font-medium text-text-muted">Beam Length (m)</label>
							<input id="beam-length" type="number" step="0.1" min="0.1" bind:value={beamLength}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
						<div>
							<label for="orientation" class="mb-1 block text-xs font-medium text-text-muted">Orientation</label>
							<select id="orientation" bind:value={orientation}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none">
								<option value="lengthwise">Lengthwise</option>
								<option value="widthwise">Widthwise</option>
							</select>
						</div>
						<div>
							<label for="min-sling-spr" class="mb-1 block text-xs font-medium text-text-muted">Min Sling (m)</label>
							<input id="min-sling-spr" type="number" step="0.1" min="0" bind:value={bottomSlingLen}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
					</div>
				{:else if configType === 'stinger'}
					<div class="mb-4">
						<label for="top-sling-len" class="mb-1 block text-xs font-medium text-text-muted">Top Sling Length (m, 0=auto)</label>
						<input id="top-sling-len" type="number" step="0.1" min="0" bind:value={topSlingLength}
							class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
					</div>
				{:else if configType === 'double-parallel'}
					<div class="mb-4 grid grid-cols-3 gap-3">
						<div>
							<label for="beam-a" class="mb-1 block text-xs font-medium text-text-muted">Beam A (m)</label>
							<input id="beam-a" type="number" step="0.1" min="0.1" bind:value={beamLengthA}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
						<div>
							<label for="beam-b" class="mb-1 block text-xs font-medium text-text-muted">Beam B (m)</label>
							<input id="beam-b" type="number" step="0.1" min="0.1" bind:value={beamLengthB}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
						<div>
							<label for="min-sling" class="mb-1 block text-xs font-medium text-text-muted">Min Sling (m)</label>
							<input id="min-sling" type="number" step="0.1" min="0" bind:value={bottomSlingLen}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
					</div>
				{:else if configType === 'double-cascade'}
					<div class="mb-4 grid grid-cols-2 gap-3">
						<div>
							<label for="master-len" class="mb-1 block text-xs font-medium text-text-muted">Main Beam (m)</label>
							<input id="master-len" type="number" step="0.1" min="0.1" bind:value={masterLength}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
						<div>
							<label for="min-sling-cas" class="mb-1 block text-xs font-medium text-text-muted">Min Sling (m)</label>
							<input id="min-sling-cas" type="number" step="0.1" min="0" bind:value={bottomSlingLen}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
						<div>
							<label for="slave-a" class="mb-1 block text-xs font-medium text-text-muted">2nd Beam A (m)</label>
							<input id="slave-a" type="number" step="0.1" min="0.1" bind:value={slaveLengthA}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
						<div>
							<label for="slave-b" class="mb-1 block text-xs font-medium text-text-muted">2nd Beam B (m)</label>
							<input id="slave-b" type="number" step="0.1" min="0.1" bind:value={slaveLengthB}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
					</div>
				{/if}

				<button
					onclick={runCalculation}
					class="w-full rounded-md bg-primary-text px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
				>
					Calculate
				</button>
			</div>

			<!-- Results -->
			<div>
				{#if error}
					<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
				{/if}

				{#if results}
					<div aria-live="polite">
						<!-- Summary -->
						<div class="mb-6 rounded-lg border border-border bg-bg-subtle p-4">
							<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-dark">Summary</h2>
							<dl class="grid grid-cols-2 gap-2 text-sm">
								<dt class="text-text-muted">Hook Height</dt>
								<dd class="font-mono text-text-dark">{results.hookHeight.toFixed(2)} m</dd>
								<dt class="text-text-muted">Headroom</dt>
								<dd class="font-mono text-text-dark">{results.headroom.toFixed(2)} m</dd>
								<dt class="text-text-muted">Height Above COG</dt>
								<dd class="font-mono text-text-dark">{results.heightAboveCOG.toFixed(2)} m</dd>
								<dt class="text-text-muted">Total Load</dt>
								<dd class="font-mono text-text-dark">{results.totalLoad.toFixed(1)} t</dd>
							</dl>
						</div>

						<!-- Warnings -->
						{#if results.warnings.cogOutsidePolygon || results.warnings.negativeTension || results.warnings.topSlingAngleLow}
							<div class="mb-6 space-y-2">
								{#if results.warnings.cogOutsidePolygon}
									<div class="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
										COG is outside the lifting point polygon
									</div>
								{/if}
								{#if results.warnings.negativeTension}
									<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
										Negative sling tension detected — check geometry
									</div>
								{/if}
								{#if results.warnings.topSlingAngleLow}
									<div class="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
										Top sling angle is below 30 degrees
									</div>
								{/if}
							</div>
						{/if}

						<!-- Sling tiers -->
						{#each results.tiers as tier}
							<div class="mb-4">
								<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dark">{tier.name}</h3>
								<div class="overflow-x-auto rounded-lg border border-border">
									<table class="w-full text-xs">
										<thead>
											<tr class="border-b border-border bg-bg-subtle">
												<th class="px-3 py-2 text-left font-medium">ID</th>
												<th class="px-3 py-2 text-left font-medium">From</th>
												<th class="px-3 py-2 text-left font-medium">To</th>
												<th class="px-3 py-2 text-right font-medium">Length (m)</th>
												<th class="px-3 py-2 text-right font-medium">Angle</th>
												<th class="px-3 py-2 text-right font-medium">Tension (t)</th>
											</tr>
										</thead>
										<tbody>
											{#each tier.slings as sling}
												<tr class="border-b border-border last:border-b-0" class:bg-red-50={sling.isCritical}>
													<td class="px-3 py-2 font-mono">{sling.id}{sling.isCritical ? ' *' : ''}</td>
													<td class="px-3 py-2">{sling.from.label}</td>
													<td class="px-3 py-2">{sling.to.label}</td>
													<td class="px-3 py-2 text-right font-mono">{sling.length.toFixed(2)}</td>
													<td class="px-3 py-2 text-right font-mono">{sling.angleDegFromHoriz.toFixed(1)}&deg;</td>
													<td class="px-3 py-2 text-right font-mono">{sling.tension.toFixed(2)}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/each}

						<!-- Beams -->
						{#if results.beams.length > 0}
							<div class="mb-4">
								<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dark">Beams</h3>
								{#each results.beams as beam}
									<div class="mb-2 rounded border border-border px-3 py-2 text-xs">
										<span class="font-medium text-text-dark">{beam.name}</span>
										<span class="ml-2 font-mono text-text-muted">Length: {beam.length.toFixed(2)} m</span>
									</div>
								{/each}
							</div>
						{/if}

						<p class="mt-4 text-xs text-text-muted">* = critical sling (highest tension)</p>
					</div>
				{:else if !error}
					<div class="flex items-center justify-center rounded-lg border border-border bg-bg-subtle p-12 text-center">
						<p class="text-sm text-text-muted">Enter parameters and click Calculate to see results.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- 3D View (full width below inputs/results grid) -->
		{#if results && SlingScene3D}
			<div class="mt-8">
				<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-dark">3D View</h2>
				<div class="rounded-lg border border-border bg-white p-2">
					<SlingScene3D {results} cog={{ x: cogX, y: cogY, z: cogZ }} />
				</div>
				<p class="mt-1 text-xs text-text-muted">Click and drag to rotate. Scroll to zoom.</p>
			</div>
		{/if}

		<!-- 2D Diagrams -->
		{#if results}
			<div class="mt-8">
				<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-dark">2D Diagrams</h2>
				<SlingDiagram {results} cog={{ x: cogX, y: cogY, z: cogZ }} />
			</div>
		{/if}
	</div>
</section>
