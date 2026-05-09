<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
	import { manualPressure, presetPressure } from '$lib/wind-calc/pressure';
	import { suspendedLoad, memberForce } from '$lib/wind-calc/in-service';
	import { outOfService } from '$lib/wind-calc/out-of-service';
	import {
		IN_SERVICE_PRESETS,
		MODE_LABELS,
		type CalcMode,
		type InServiceCategory,
		type PressureResult,
		type RecurrenceInterval,
		type SuspendedLoadResult,
		type MemberResult,
		type OutOfServiceResult
	} from '$lib/wind-calc/types';

	let mode: CalcMode = $state('suspended-load');

	// ── Shared in-service speed source ───────────────────────────────────────
	let speedSource: 'preset' | 'manual' = $state('preset');
	let presetCategory: InServiceCategory = $state('normal');
	let manualSpeed = $state(20);

	// ── Suspended load inputs ────────────────────────────────────────────────
	let cH = $state(1.2);
	let aH = $state(6);

	// ── Member inputs ────────────────────────────────────────────────────────
	let A = $state(2);
	let Cf = $state(1.5);
	let useFrames = $state(false);
	let frameCount = $state(3);
	let eta = $state(0.5);
	let useInclination = $state(false);
	let inclinationDeg = $state(90);

	// ── Out-of-service inputs ────────────────────────────────────────────────
	let vRef = $state(40);
	let returnPeriod: RecurrenceInterval = $state(50);
	let z = $state(20);
	let useOosTheta = $state(false);
	let thetaDeg = $state(90);
	let oosA = $state<number | null>(null);
	let oosCf = $state<number | null>(null);

	// ── Live results (Svelte 5 $derived) ─────────────────────────────────────
	type Outcome<T> = { result: T | null; error: string };

	function compute<T>(fn: () => T): Outcome<T> {
		try {
			return { result: fn(), error: '' };
		} catch (e) {
			return { result: null, error: e instanceof Error ? e.message : 'Calc failed' };
		}
	}

	// Pressure derivation is wrapped so a transient invalid manual speed
	// (e.g. user clearing the input mid-edit) cannot crash render.
	const pressureOutcome = $derived.by((): Outcome<PressureResult> =>
		compute(() =>
			speedSource === 'preset' ? presetPressure(presetCategory) : manualPressure(manualSpeed)
		)
	);
	const pressure = $derived(pressureOutcome.result);

	const suspendedOutcome = $derived.by((): Outcome<SuspendedLoadResult> => {
		if (mode !== 'suspended-load') return { result: null, error: '' };
		if (!pressure) return { result: null, error: pressureOutcome.error };
		return compute(() => suspendedLoad({ pressure, c_H: cH, A_H: aH }));
	});

	const memberOutcome = $derived.by((): Outcome<MemberResult> => {
		if (mode !== 'member') return { result: null, error: '' };
		if (!pressure) return { result: null, error: pressureOutcome.error };
		return compute(() =>
			memberForce({
				pressure,
				A,
				C_f: Cf,
				...(useFrames ? { frames: { count: frameCount, eta } } : {}),
				...(useInclination ? { inclinationDeg } : {})
			})
		);
	});

	const oosOutcome = $derived.by((): Outcome<OutOfServiceResult> =>
		mode === 'out-of-service'
			? compute(() =>
					outOfService({
						v_ref: vRef,
						R: returnPeriod,
						z,
						...(useOosTheta ? { thetaDeg } : {}),
						...(oosA !== null && oosCf !== null ? { A: oosA, C_f: oosCf } : {})
					})
				)
			: { result: null, error: '' }
	);

	const suspendedResult = $derived(suspendedOutcome.result);
	const memberResult = $derived(memberOutcome.result);
	const oosResult = $derived(oosOutcome.result);
	const error = $derived(suspendedOutcome.error || memberOutcome.error || oosOutcome.error);

	function fmt(n: number | null | undefined, dp = 2): string {
		if (typeof n !== 'number' || !isFinite(n)) return '—';
		return n.toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: dp });
	}

	function fmtForce(n: number | null | undefined): string {
		if (typeof n !== 'number' || !isFinite(n)) return '—';
		return n >= 1000 ? `${fmt(n / 1000)} kN` : `${fmt(n, 0)} N`;
	}

	const modes: [CalcMode, string][] = [
		['suspended-load', MODE_LABELS['suspended-load']],
		['member', MODE_LABELS['member']],
		['out-of-service', MODE_LABELS['out-of-service']]
	];
</script>

<SeoMeta
	title="Crane Wind Load Calculator (AS 5222) — HJ Engineering"
	description="Free online crane wind load calculator implementing AS 5222:2021 — in-service wind on suspended loads and crane members, plus out-of-service storm wind."
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hjengineering.com.au/" },
			{ "@type": "ListItem", "position": 2, "name": "Wind Calculator", "item": "https://hjengineering.com.au/tools/wind-calculator" }
		]
	})}</script>`}
</svelte:head>

<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-12 text-center text-text-light print:bg-none print:bg-white print:py-4 print:text-black">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">Engineering Tools</p>
	<h1 class="mx-auto mb-3 max-w-xl text-3xl font-bold">Crane Wind Load Calculator</h1>
	<p class="mx-auto max-w-2xl text-sm leading-relaxed text-text-faint">
		Wind force on suspended loads and crane structures per AS 5222:2021. In-service operating wind
		(§5) and out-of-service storm wind with height-varying profile (§6). Runs entirely in your browser.
	</p>
</section>

<section class="bg-bg-light px-8 py-8">
	<div class="mx-auto max-w-5xl">
		<!-- Mode tabs -->
		<div class="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-bg-subtle p-1 print:hidden">
			{#each modes as [key, label]}
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {mode === key
						? 'bg-bg-light text-text-dark shadow-sm'
						: 'text-text-muted hover:text-text-dark'}"
					onclick={() => (mode = key)}
				>
					{label}
				</button>
			{/each}
		</div>

		<!-- Print-only mode header -->
		<div class="mb-4 hidden border-b border-border pb-2 text-sm print:block">
			<strong>Mode:</strong> {MODE_LABELS[mode]} &nbsp;·&nbsp; <strong>Generated:</strong> {new Date().toLocaleString('en-AU')}
		</div>

		{#if error}
			<div class="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
				{error}
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Inputs -->
			<div>
				{#if mode === 'suspended-load' || mode === 'member'}
					<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-dark">Wind speed</h2>
					<div class="mb-6 space-y-3">
						<div class="flex gap-3">
							<label class="flex items-center gap-2 text-sm">
								<input type="radio" bind:group={speedSource} value="preset" />
								<span>Category preset</span>
							</label>
							<label class="flex items-center gap-2 text-sm">
								<input type="radio" bind:group={speedSource} value="manual" />
								<span>Manual v_s</span>
							</label>
						</div>

						{#if speedSource === 'preset'}
							<div class="space-y-2">
								{#each Object.values(IN_SERVICE_PRESETS) as preset}
									<label class="flex items-start gap-2 rounded-md border border-border bg-bg-subtle p-3 text-sm has-[:checked]:border-primary-text has-[:checked]:bg-primary-text/5">
										<input type="radio" bind:group={presetCategory} value={preset.category} class="mt-0.5" />
										<div class="flex-1">
											<div class="font-medium text-text-dark">{preset.label} — {preset.v_s} m/s</div>
											<div class="text-xs text-text-muted">{preset.description}</div>
											<div class="mt-1 text-xs text-text-muted">p = {preset.p} N/m²</div>
										</div>
									</label>
								{/each}
							</div>
						{:else}
							<div class="flex items-end gap-3">
								<div class="flex-1">
									<label for="manual-speed" class="mb-1 block text-xs font-medium text-text-muted">Wind speed v_s (m/s)</label>
									<input id="manual-speed" type="number" step="0.1" min="0" bind:value={manualSpeed}
										class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
								</div>
								<div class="text-xs text-text-muted">→ p = {pressure ? fmt(pressure.p) : '—'} N/m²</div>
							</div>
						{/if}
					</div>
				{/if}

				{#if mode === 'suspended-load'}
					<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-dark">Suspended load</h2>
					<div class="space-y-3">
						<div>
							<label for="ah" class="mb-1 block text-xs font-medium text-text-muted">Wind area A_H (m²)</label>
							<input id="ah" type="number" step="0.1" min="0" bind:value={aH}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
						<div>
							<label for="ch" class="mb-1 block text-xs font-medium text-text-muted">
								Shape coefficient c_H
								<a href="#cf-guide" class="ml-1 text-primary-text underline-offset-2 hover:underline" title="Typical C_f ranges">[?]</a>
							</label>
							<input id="ch" type="number" step="0.05" min="0" bind:value={cH}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
					</div>
				{/if}

				{#if mode === 'member'}
					<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-dark">Member</h2>
					<div class="space-y-3">
						<div>
							<label for="m-A" class="mb-1 block text-xs font-medium text-text-muted">Solid area A (m²)</label>
							<input id="m-A" type="number" step="0.01" min="0" bind:value={A}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
						<div>
							<label for="m-Cf" class="mb-1 block text-xs font-medium text-text-muted">
								Shape coefficient C_f
								<a href="#cf-guide" class="ml-1 text-primary-text underline-offset-2 hover:underline" title="Typical C_f ranges">[?]</a>
							</label>
							<input id="m-Cf" type="number" step="0.05" min="0" bind:value={Cf}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>

						<label class="mt-2 flex items-center gap-2 text-sm">
							<input type="checkbox" bind:checked={useFrames} />
							<span>Multi-frame shielding (§5.5)</span>
						</label>
						{#if useFrames}
							<div class="ml-6 grid grid-cols-2 gap-3">
								<div>
									<label for="m-n" class="mb-1 block text-xs font-medium text-text-muted">Frame count n</label>
									<input id="m-n" type="number" step="1" min="1" bind:value={frameCount}
										class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
								</div>
								<div>
									<label for="m-eta" class="mb-1 block text-xs font-medium text-text-muted">
										η
										<a href="#eta-guide" class="ml-1 text-primary-text underline-offset-2 hover:underline" title="Typical η ranges">[?]</a>
									</label>
									<input id="m-eta" type="number" step="0.05" min="0" max="1" bind:value={eta}
										class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
								</div>
							</div>
						{/if}

						<label class="mt-2 flex items-center gap-2 text-sm">
							<input type="checkbox" bind:checked={useInclination} />
							<span>Member inclined to wind (§5.6)</span>
						</label>
						{#if useInclination}
							<div class="ml-6">
								<label for="m-incl" class="mb-1 block text-xs font-medium text-text-muted">Angle α (°) — 90° = perpendicular</label>
								<input id="m-incl" type="number" step="1" min="0" max="90" bind:value={inclinationDeg}
									class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
							</div>
						{/if}
					</div>
				{/if}

				{#if mode === 'out-of-service'}
					<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-dark">Storm wind reference</h2>
					<div class="space-y-3">
						<div>
							<label for="oos-vref" class="mb-1 block text-xs font-medium text-text-muted">
								v_ref (m/s) — 50-yr 10-min mean storm wind at 10 m, flat open country
								<a href="#vref-guide" class="ml-1 text-primary-text underline-offset-2 hover:underline" title="v_ref guidance">[?]</a>
							</label>
							<input id="oos-vref" type="number" step="0.5" min="0" bind:value={vRef}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>
						<div>
							<label for="oos-R" class="mb-1 block text-xs font-medium text-text-muted">Return period R (years)</label>
							<select id="oos-R" bind:value={returnPeriod}
								class="w-full rounded border border-border bg-bg-light px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none">
								<option value={5}>5 (f_rec = 0.815)</option>
								<option value={10}>10 (f_rec = 0.873)</option>
								<option value={20}>20 (f_rec = 0.946)</option>
								<option value={50}>50 (f_rec = 1.000)</option>
							</select>
						</div>
						<div>
							<label for="oos-z" class="mb-1 block text-xs font-medium text-text-muted">Evaluation height z (m)</label>
							<input id="oos-z" type="number" step="0.5" min="0" bind:value={z}
								class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
						</div>

						<label class="mt-2 flex items-center gap-2 text-sm">
							<input type="checkbox" bind:checked={useOosTheta} />
							<span>Member inclined to wind (§6.4)</span>
						</label>
						{#if useOosTheta}
							<div class="ml-6">
								<label for="oos-theta" class="mb-1 block text-xs font-medium text-text-muted">Angle θ (°)</label>
								<input id="oos-theta" type="number" step="1" min="0" max="90" bind:value={thetaDeg}
									class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
							</div>
						{/if}

						<div class="mt-3 rounded-md border border-border bg-bg-subtle p-3">
							<div class="mb-2 text-xs font-medium text-text-muted">Optional: compute force on member</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="oos-A" class="mb-1 block text-xs font-medium text-text-muted">A (m²)</label>
									<input id="oos-A" type="number" step="0.01" min="0" bind:value={oosA}
										class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
								</div>
								<div>
									<label for="oos-Cf" class="mb-1 block text-xs font-medium text-text-muted">C_f</label>
									<input id="oos-Cf" type="number" step="0.05" min="0" bind:value={oosCf}
										class="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-primary-text focus:outline-none" />
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Results -->
			<div>
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-sm font-semibold uppercase tracking-wide text-text-dark">Results</h2>
					<button
						type="button"
						onclick={() => window.print()}
						class="rounded-md border border-border bg-bg-light px-3 py-1 text-xs font-medium text-text-dark transition-colors hover:border-primary-text hover:text-primary-text print:hidden"
						title="Print or save as PDF"
					>
						🖨 Print summary
					</button>
				</div>

				{#if mode === 'suspended-load' && suspendedResult}
					<div class="space-y-3 rounded-md border border-border bg-bg-subtle p-4">
						{@render resultRow('Wind speed v_s', `${fmt(suspendedResult.pressure.v_s)} m/s`, false)}
						{@render resultRow('Wind pressure p', `${fmt(suspendedResult.pressure.p)} N/m²`, false)}
						{@render resultRow('Shape coefficient c_H', fmt(suspendedResult.c_H), false)}
						{@render resultRow('Wind area A_H', `${fmt(suspendedResult.A_H)} m²`, false)}
						<hr class="border-border" />
						{@render resultRow('Wind force F_w', fmtForce(suspendedResult.F_w), true)}
						<p class="text-xs italic text-text-muted">F_w = c_H × A_H × p (AS 5222 eq 3)</p>
					</div>
				{/if}

				{#if mode === 'member' && memberResult}
					<div class="space-y-3 rounded-md border border-border bg-bg-subtle p-4">
						{@render resultRow('Wind pressure p', `${fmt(memberResult.pressure.p)} N/m²`, false)}
						{@render resultRow('Single-member force F', fmtForce(memberResult.F_single), !useFrames && !useInclination)}
						<p class="text-xs italic text-text-muted">F = A × p × C_f (AS 5222 eq 4)</p>

						{#if memberResult.F_inclined !== undefined}
							<hr class="border-border" />
							{@render resultRow('Inclined F · sin(α)', fmtForce(memberResult.F_inclined), !useFrames)}
							<p class="text-xs italic text-text-muted">α = {inclinationDeg}° (AS 5222 eq 7)</p>
						{/if}

						{#if memberResult.frameForces && memberResult.F_total !== undefined}
							<hr class="border-border" />
							{@render resultRow('Total cumulative force ΣF_n', fmtForce(memberResult.F_total), true)}
							{@render resultRow('Shielding reduction', `${fmt(memberResult.shieldingReductionPct ?? 0, 1)}%`, false)}
							<details class="text-xs text-text-muted">
								<summary class="cursor-pointer">Per-frame breakdown ({memberResult.frameForces.length} frames)</summary>
								<table class="mt-2 w-full text-xs">
									<thead>
										<tr class="border-b border-border">
											<th class="py-1 text-left font-medium">n</th>
											<th class="py-1 text-right font-medium">Cumulative F_n</th>
										</tr>
									</thead>
									<tbody>
										{#each memberResult.frameForces as F_n, i}
											<tr><td class="py-0.5">{i + 1}</td><td class="py-0.5 text-right">{fmtForce(F_n)}</td></tr>
										{/each}
									</tbody>
								</table>
							</details>
							<p class="text-xs italic text-text-muted">F_n = (1 − η^n)/(1 − η) × F (AS 5222 eq 5)</p>
						{/if}
					</div>
				{/if}

				{#if mode === 'out-of-service' && oosResult}
					<div class="space-y-3 rounded-md border border-border bg-bg-subtle p-4">
						{@render resultRow(`f_rec (R=${oosResult.R})`, fmt(oosResult.f_rec, 3), false)}
						{@render resultRow(`v(z=${oosResult.z} m)`, `${fmt(oosResult.v_z)} m/s`, false)}
						{@render resultRow('q(z) dynamic pressure', `${fmt(oosResult.p_z)} N/m²`, !useOosTheta && oosResult.F === undefined)}
						<p class="text-xs italic text-text-muted">v(z) = f_rec × [(z/10)^0.14 + 0.4] × v_ref (AS 5222 eq 11)</p>

						{#if oosResult.v_z_inclined !== undefined && oosResult.p_z_inclined !== undefined}
							<hr class="border-border" />
							{@render resultRow('v(z*) = v(z) × sin(θ)', `${fmt(oosResult.v_z_inclined)} m/s`, false)}
							{@render resultRow('q(z*) inclined', `${fmt(oosResult.p_z_inclined)} N/m²`, oosResult.F === undefined)}
							<p class="text-xs italic text-text-muted">θ = {oosResult.thetaDeg}° (AS 5222 eq 12)</p>
						{/if}

						{#if oosResult.F !== undefined}
							<hr class="border-border" />
							{@render resultRow('Force on member F', fmtForce(oosResult.F), true)}
							<p class="text-xs italic text-text-muted">F = q × C_f × A (AS 5222 eq 8)</p>
						{/if}

						<details class="text-xs text-text-muted">
							<summary class="cursor-pointer">Wind profile vs height</summary>
							<table class="mt-2 w-full text-xs">
								<thead>
									<tr class="border-b border-border">
										<th class="py-1 text-left font-medium">z (m)</th>
										<th class="py-1 text-right font-medium">v(z) (m/s)</th>
										<th class="py-1 text-right font-medium">q(z) (N/m²)</th>
									</tr>
								</thead>
								<tbody>
									{#each oosResult.profile as row}
										<tr class={row.z === oosResult.z ? 'bg-primary-text/10 font-medium' : ''}>
											<td class="py-0.5">{row.z}</td>
											<td class="py-0.5 text-right">{fmt(row.v)}</td>
											<td class="py-0.5 text-right">{fmt(row.p)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</details>
					</div>
				{/if}
			</div>
		</div>

		<!-- Coefficient guide -->
		<details id="coeff-guide" class="mt-8 rounded-md border border-border bg-bg-subtle p-4 text-sm">
			<summary class="cursor-pointer font-semibold text-text-dark">Coefficient guide — typical ranges</summary>
			<div class="mt-4 space-y-5 leading-relaxed text-text-body">
				<p class="text-xs text-text-muted">
					Editorial ranges drawn from common wind-engineering literature (Eurocode EN 1991‑1‑4,
					Cook's <em>Designer's Guide to Wind Loading</em>, Hoerner's <em>Fluid‑Dynamic Drag</em>,
					ESDU data sheets, ISO 4354). Values are first-pass guidance only — for authoritative
					design figures consult AS 5222 §5.4 Table 2 (shape coefficients) and Table 4
					(shielding factors).
				</p>

				<div id="cf-guide">
					<h3 class="mb-2 text-sm font-semibold text-text-dark">Shape coefficient C_f</h3>
					<p class="mb-3 text-xs text-text-muted">
						C_f is the drag coefficient referred to the projected solid area. It depends on
						member shape, aspect ratio, surface roughness, and (for round sections) the
						Reynolds number Re = v·d/ν.
					</p>
					<table class="w-full text-xs">
						<thead>
							<tr class="border-b border-border text-text-muted">
								<th class="py-1.5 pr-3 text-left font-medium">Member type</th>
								<th class="py-1.5 pr-3 text-left font-medium">Typical C_f</th>
								<th class="py-1.5 text-left font-medium">Notes</th>
							</tr>
						</thead>
						<tbody class="align-top">
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3 font-medium text-text-dark">Flat plate / sheet panel</td>
								<td class="py-1.5 pr-3 font-mono">1.1 – 2.0</td>
								<td class="py-1.5 text-text-muted">Square panel ≈ 1.1; rises with aspect ratio l/b — long, slender plates approach 2.0.</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3 font-medium text-text-dark">Suspended load — flat / billboard</td>
								<td class="py-1.5 pr-3 font-mono">1.2 – 2.0</td>
								<td class="py-1.5 text-text-muted">Treat as flat plate at the worst-case orientation. Tarpaulins, signage, façade panels.</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3 font-medium text-text-dark">Suspended load — compact / rounded</td>
								<td class="py-1.5 pr-3 font-mono">0.7 – 1.1</td>
								<td class="py-1.5 text-text-muted">Steel coils, tanks, generators, motors — closed bodies with rounded faces.</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3 font-medium text-text-dark">Box / I / channel section</td>
								<td class="py-1.5 pr-3 font-mono">1.4 – 2.0</td>
								<td class="py-1.5 text-text-muted">Sharp-edged structural sections. Higher with low slenderness; lower for long booms.</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3 font-medium text-text-dark">Circular section — subcritical</td>
								<td class="py-1.5 pr-3 font-mono">≈ 1.2</td>
								<td class="py-1.5 text-text-muted">Re &lt; ~2×10⁵ (small diameter or low wind). Rough surface keeps you here longer.</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3 font-medium text-text-dark">Circular section — supercritical</td>
								<td class="py-1.5 pr-3 font-mono">0.5 – 0.8</td>
								<td class="py-1.5 text-text-muted">Re &gt; ~4×10⁵ — drag crisis. Smooth large-diameter pipes, mast columns at storm speeds.</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3 font-medium text-text-dark">Lattice frame — sharp-edge members</td>
								<td class="py-1.5 pr-3 font-mono">1.4 – 1.8</td>
								<td class="py-1.5 text-text-muted">Referred to solid area. Solidity ratio φ = solid / enclosed; lower φ → upper end of range.</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3 font-medium text-text-dark">Lattice frame — round-tube (supercritical)</td>
								<td class="py-1.5 pr-3 font-mono">0.8 – 1.2</td>
								<td class="py-1.5 text-text-muted">Tubular booms in storm wind. Drops markedly once individual members go supercritical.</td>
							</tr>
							<tr>
								<td class="py-1.5 pr-3 font-medium text-text-dark">Machinery house / cab (enclosed)</td>
								<td class="py-1.5 pr-3 font-mono">1.1 – 1.4</td>
								<td class="py-1.5 text-text-muted">Treat as small bluff building. Apply to projected face area.</td>
							</tr>
						</tbody>
					</table>
					<p class="mt-3 text-xs text-text-muted">
						Reynolds number rule of thumb: Re ≈ 70 000 × v(m/s) × d(m) for air at 20 °C.
						A 0.3 m diameter circular boom in 30 m/s wind gives Re ≈ 6.3×10⁵ — supercritical.
					</p>
				</div>

				<div id="eta-guide">
					<h3 class="mb-2 text-sm font-semibold text-text-dark">Shielding factor η</h3>
					<p class="mb-2 text-xs text-text-muted">
						η is the fraction of the upstream wind that reaches the next downstream frame
						in a series of identical, equally spaced parallel frames (e.g. lattice booms,
						scaffold towers, shutter slats). η = 0 means full shielding; η = 1 means no
						shielding.
					</p>
					<p class="mb-2 text-xs text-text-muted">
						Two parameters drive it: <strong>solidity ratio</strong> φ (the frame's solid
						silhouette area / enclosed area) and <strong>spacing ratio</strong> a/b (gap
						between facing sides / breadth of member across the wind).
					</p>
					<ul class="ml-4 list-disc space-y-1 text-xs text-text-muted">
						<li>High solidity (φ &gt; 0.5) + close spacing (a/b &lt; 1) → strong shielding, η typically 0.1–0.3</li>
						<li>Mid solidity (φ ≈ 0.2–0.4) + moderate spacing (a/b 1–4) → η typically 0.4–0.7</li>
						<li>Low solidity (φ &lt; 0.1) or wide spacing (a/b &gt; 4) → little shielding, η &gt; 0.8</li>
					</ul>
					<p class="mt-2 text-xs text-text-muted">
						AS 5222 §5.5 caps the shielding accumulation at 8 frames — every additional
						downstream frame past the 8th contributes the same incremental load as the 8th
						(implemented in this calculator).
					</p>
				</div>

				<div id="vref-guide">
					<h3 class="mb-2 text-sm font-semibold text-text-dark">v_ref for out-of-service wind (Australia)</h3>
					<p class="text-xs text-text-muted">
						v_ref is the 50-year 10-minute mean storm wind speed at 10 m above flat open
						country. AS 1418.1 maps Australia into wind regions and tabulates v_ref by
						region — typical values fall in roughly 30–55 m/s, increasing toward the
						cyclone-prone north. Cross-reference your project's wind-region classification
						(usually from the structural engineer or AS/NZS 1170.2) before entering a value.
					</p>
				</div>
			</div>
		</details>

		<!-- Disclaimer -->
		<div class="mt-8 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-xs leading-relaxed text-yellow-900">
			<strong>Engineering aid only.</strong> Calculator implements the formulas of
			AS 5222:2021 (Cranes — Wind load assessment, ISO 4302:2016 MOD). Shape coefficients (C_f),
			shielding factors (η), and reference storm wind speeds (v_ref) are user inputs — refer to
			AS 5222 Tables 2 & 4, and to AS 1418.1 for Australian regional storm wind speeds. Final
			design responsibility rests with the engineer of record. Verify all results independently.
		</div>
	</div>
</section>

{#snippet resultRow(label: string, value: string, highlight: boolean)}
	<div class="flex items-baseline justify-between gap-4">
		<span class="text-xs text-text-muted">{label}</span>
		<span class="font-mono text-sm {highlight ? 'font-bold text-primary-text' : 'text-text-dark'}">{value}</span>
	</div>
{/snippet}
