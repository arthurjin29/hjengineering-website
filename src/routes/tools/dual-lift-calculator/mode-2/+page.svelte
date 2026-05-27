<!-- web/src/routes/mode-2/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { computeTailing, computeTailingGeneral } from '$lib/dual-lift-calc/mode2';
  import GeometryMode2 from '$lib/dual-lift-calc/GeometryMode2.svelte';
  import ChartFvTheta from '$lib/dual-lift-calc/ChartFvTheta.svelte';

  // ─── Primary load definition (mirrors Mode 1) ───────────────────────────
  // Geometry is defined in load-local coordinates with the load LYING DOWN
  // (horizontal). All positions rotate with the load as θ goes 0 → 90°.
  // Defaults are set so the head lift point ends up directly above the COG
  // when the load reaches vertical (head pick on the centerline through COG
  // along the length axis: y_lp1 = y_cog, x_lp1 < x_cog).
  let M_kg  = $state(5000);
  let L_m   = $state(6.0);      // length (along the load axis — the dimension that ends up vertical)
  let W_m   = $state(0.5);      // width (into the page)
  let H_m   = $state(2.4);      // height (perpendicular to length in side view; also the rectangle thickness)

  // COG in load-local frame — defaults to geometric centre, user-editable
  let x_cog = $state(3.0);      // = L/2
  let y_cog = $state(1.2);      // = H/2

  // Head pick — default left end of horizontal load, vertically aligned with COG.
  // When load rotates to vertical (θ=90°), this point ends up directly above COG.
  let x_lp1 = $state(0);
  let y_lp1 = $state(1.2);      // = y_cog (on the COG centerline)

  // Tail pick — default tailing end TOP CORNER (right end, top edge).
  // This is where a real tailing lug is usually welded. Walks up during tailing
  // and ends up at the bottom of the vertical load.
  let x_lp2 = $state(6.0);      // = L (right end)
  let y_lp2 = $state(2.4);      // = H (top edge — top corner of tailing end)

  let Y1_m = $state(0);         // tail lug perpendicular offset — default 0 (lug overlaps tail pick)
  let theta_deg = $state(30);

  // Manual-override tracking for auto-defaults
  let manual = $state({
    x_cog: false, y_cog: false,
    x_lp1: false, y_lp1: false,
    x_lp2: false, y_lp2: false,
  });

  // Auto-resync dependents when L or H changes
  $effect(() => {
    L_m;
    if (!manual.x_cog) x_cog = L_m / 2;
    if (!manual.x_lp1) x_lp1 = 0;
    if (!manual.x_lp2) x_lp2 = L_m;
  });
  $effect(() => {
    H_m;
    if (!manual.y_cog) y_cog = H_m / 2;
    if (!manual.y_lp1) y_lp1 = H_m / 2;   // head: on COG centerline (for exact head-above-COG at θ=90°)
    if (!manual.y_lp2) y_lp2 = H_m;       // tail: top corner of tailing end (typical real lug position)
  });

  function resetGeometryDefaults() {
    for (const k of Object.keys(manual) as (keyof typeof manual)[]) manual[k] = false;
    x_cog = L_m / 2; y_cog = H_m / 2;
    x_lp1 = 0;       y_lp1 = H_m / 2;
    x_lp2 = L_m;     y_lp2 = H_m;
    Y1_m = 0;
  }

  // ─── Derived calc inputs ────────────────────────────────────────────────
  // The existing computeTailing function works in 1D: distances along the load
  // axis from head pick to COG (X1) and tail pick to COG (X2), plus tail lug
  // perpendicular offset Y1. Project the x/y picks onto the centerline through
  // COG for the calc. If user moves y_lp1 or y_lp2 off y_cog (see warning),
  // the calc treats them as on-axis; visualisation still shows actual position.
  // 2-D vectors in load-local frame (load horizontal) — these feed the
  // general moment-balance formula. As θ varies, the calc uses these via
  // computeTailingGeneral; the x/y offsets of the tail pick contribute
  // properly so F_tail correctly drops from M·X1/(X1+X2) at θ=0 to 0 at
  // natural hang, instead of staying constant when Y1 = 0.
  let dx_m  = $derived(x_cog - x_lp1);
  let dy_m  = $derived(y_cog - y_lp1);
  let dxt_m = $derived(x_lp2 - x_lp1);
  let dyt_m = $derived((y_lp2 + Y1_m) - y_lp1);

  // 1-D equivalents (kept for Method/References display only — calc uses general form)
  let X1_m = $derived(Math.abs(x_cog - x_lp1));
  let X2_m = $derived(Math.abs(x_lp2 - x_cog));
  let off_axis_warning = $derived(
    Math.abs(y_lp1 - y_cog) > 1e-6 || Math.abs(y_lp2 - y_cog) > 1e-6
  );

  // ─── Geometry validation ────────────────────────────────────────────────
  // (1) COG must stay on the tail side of the head pick. If x_cog ≤ x_lp1, the
  //     head pick has been moved past the COG along the load axis — physically
  //     wonky (head crane would lift from the heavy side past balance).
  let cog_past_head = $derived(x_cog <= x_lp1);

  // (2) Natural hanging angle — solve (dx cos θ + dy sin θ) = 0 for the user's
  //     range [0°, 90°]. Past θ_natural, F_tail would go negative (tail crane
  //     would need to push downward, which a hoist can't do). For default
  //     geometry (head on COG centerline, dy = 0), θ_natural = 90°.
  let theta_natural_deg = $derived.by(() => {
    const dx = dx_m, dy = dy_m;
    if (dx <= 0) return 0;
    if (Math.abs(dy) < 1e-9) return 90;
    if (dy < 0) return Math.atan(dx / -dy) * 180 / Math.PI;
    return Math.min(180 - Math.atan(dx / dy) * 180 / Math.PI, 90);
  });
  let theta_not_achievable = $derived(theta_deg > theta_natural_deg + 0.1);

  let r_now = $derived(computeTailingGeneral({ M_kg, dx_m, dy_m, dxt_m, dyt_m, theta_deg }));

  // Key angles for the 3-point tailing assessment: start, near-vertical, end.
  const KEY_ANGLES = [0, 76, 90] as const;
  const KEY_LABELS: Record<number, string> = {
    0:  'start — horizontal',
    76: 'near-vertical',
    90: 'end — upright'
  };
  let key_results = $derived(KEY_ANGLES.map(t => ({
    theta: t,
    label: KEY_LABELS[t],
    ...computeTailingGeneral({ M_kg, dx_m, dy_m, dxt_m, dyt_m, theta_deg: t })
  })));

  function saveCase() {
    const c = {
      schema_version: 2,
      mode: 'mode2',
      inputs: {
        M_kg, L_m, W_m, H_m,
        x_cog, y_cog,
        x_lp1, y_lp1, x_lp2, y_lp2,
        Y1_m, theta_deg,
        // derived (CLI compatibility)
        X1_m, X2_m
      }
    };
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dual-lift-mode2.case.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const rows = ['theta_deg,F_head_kg,F_tail_kg'];
    for (let t = 0; t <= 90; t++) {
      const r = computeTailing({ M_kg, X1_m, X2_m, Y1_m, theta_deg: t });
      rows.push(`${t},${r.F_head_kg.toFixed(1)},${r.F_tail_kg.toFixed(1)}`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dual-lift-mode2-table.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  onMount(() => {
    const raw = sessionStorage.getItem('dual-lift-case');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.mode === 'mode2') {
        M_kg = data.inputs.M_kg ?? M_kg;
        L_m  = data.inputs.L_m ?? L_m;
        W_m  = data.inputs.W_m ?? W_m;
        H_m  = data.inputs.H_m ?? H_m;
        if (data.inputs.x_cog != null) { x_cog = data.inputs.x_cog; manual.x_cog = true; }
        if (data.inputs.y_cog != null) { y_cog = data.inputs.y_cog; manual.y_cog = true; }
        if (data.inputs.x_lp1 != null) { x_lp1 = data.inputs.x_lp1; manual.x_lp1 = true; }
        if (data.inputs.y_lp1 != null) { y_lp1 = data.inputs.y_lp1; manual.y_lp1 = true; }
        if (data.inputs.x_lp2 != null) { x_lp2 = data.inputs.x_lp2; manual.x_lp2 = true; }
        if (data.inputs.y_lp2 != null) { y_lp2 = data.inputs.y_lp2; manual.y_lp2 = true; }
        Y1_m = data.inputs.Y1_m ?? Y1_m;
        theta_deg = data.inputs.theta_deg ?? theta_deg;
      }
    } finally {
      sessionStorage.removeItem('dual-lift-case');
    }
  });
</script>

<div class="mode-stack">

  <!-- 1. INPUTS -->
  <section class="card">
    <h2>1. Inputs</h2>

    <!-- LOAD -->
    <div class="input-section">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Load</p>
      </div>
      <div class="input-row cols-4">
        <label class="field">
          <span class="field-name">Mass <var>M</var> [kg]</span>
          <input type="number" bind:value={M_kg} />
          <span class="field-help">Total weight of the load.</span>
        </label>
        <label class="field">
          <span class="field-name">Length <var>L</var> [m]</span>
          <input type="number" step="0.1" bind:value={L_m} />
          <span class="field-help">Long axis — vertical at θ=90°.</span>
        </label>
        <label class="field">
          <span class="field-name">Width <var>W</var> [m]</span>
          <input type="number" step="0.1" bind:value={W_m} />
          <span class="field-help">Depth into the page (not in calc).</span>
        </label>
        <label class="field">
          <span class="field-name">Height <var>H</var> [m]</span>
          <input type="number" step="0.1" bind:value={H_m} />
          <span class="field-help">Short axis / side-view thickness.</span>
        </label>
      </div>
    </div>

    <!-- CENTRE OF GRAVITY -->
    <div class="input-section">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Centre of gravity</p>
        <span class="auto-hint">defaults to geometric centre — load-local coords (load horizontal)</span>
      </div>
      <div class="input-row cols-2">
        <label class="field">
          <span class="field-name">
            <var>x</var><sub>cog</sub> [m]
            {#if !manual.x_cog}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={x_cog} min="0" max={L_m}
                 oninput={() => manual.x_cog = true} />
          <span class="field-help">Distance from LEFT end of horizontal load to COG, along <var>L</var>.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>y</var><sub>cog</sub> [m]
            {#if !manual.y_cog}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.05" bind:value={y_cog} min="0" max={H_m}
                 oninput={() => manual.y_cog = true} />
          <span class="field-help">Above BASE. Uniform beam ≈ <var>H</var>/2.</span>
        </label>
      </div>
    </div>

    <!-- LIFT POINTS -->
    <div class="input-section">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Lift points</p>
        <span class="auto-hint">picks default to load ends on COG centerline → head above COG at θ=90°; tail at top corner</span>
      </div>
      <div class="input-row cols-4">
        <label class="field">
          <span class="field-name">
            <var>x</var><sub>lp1</sub> [m] — head
            {#if !manual.x_lp1}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={x_lp1} min="0" max={L_m}
                 oninput={() => manual.x_lp1 = true} />
          <span class="field-help">Head pick — end that becomes TOP when vertical.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>y</var><sub>lp1</sub> [m] — head
            {#if !manual.y_lp1}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.05" bind:value={y_lp1} min="0"
                 oninput={() => manual.y_lp1 = true} />
          <span class="field-help">Keep = <var>y</var><sub>cog</sub> for exact head-above-COG.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>x</var><sub>lp2</sub> [m] — tail
            {#if !manual.x_lp2}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={x_lp2} min="0" max={L_m}
                 oninput={() => manual.x_lp2 = true} />
          <span class="field-help">Tail pick — end that walks.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>y</var><sub>lp2</sub> [m] — tail
            {#if !manual.y_lp2}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.05" bind:value={y_lp2} min="0"
                 oninput={() => manual.y_lp2 = true} />
          <span class="field-help">Tail pick height above BASE.</span>
        </label>
      </div>
    </div>

    <!-- TAIL LUG -->
    <div class="input-section">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Tail lug</p>
        <span class="auto-hint">perpendicular offset above the tail pick — default 0 (lug overlaps tail pick)</span>
      </div>
      <div class="input-row cols-1">
        <label class="field">
          <span class="field-name"><var>Y</var><sub>1</sub> [m] — lug offset</span>
          <input type="number" step="0.1" min="0" bind:value={Y1_m} />
          <span class="field-help">Lug perpendicular above tail pick (load-local +y direction).</span>
        </label>
      </div>
    </div>

    {#if cog_past_head}
      <p class="validation-error">
        <strong>Geometry error:</strong> COG is at or past the head pick along the load axis
        (<var>x</var><sub>cog</sub> = {x_cog.toFixed(2)} ≤ <var>x</var><sub>lp1</sub> = {x_lp1.toFixed(2)}).
        For tailing, the head pick must sit on the side opposite to the tail end, with the COG between them.
        Move the head pick or COG so <var>x</var><sub>cog</sub> &gt; <var>x</var><sub>lp1</sub>.
      </p>
    {:else if theta_not_achievable}
      <p class="validation-error">
        <strong>θ not achievable:</strong> with the current geometry the load hangs naturally at
        <strong>θ<sub>natural</sub> = {theta_natural_deg.toFixed(1)}°</strong>
        (head pick is off the COG centerline). Any θ above this would require the tail crane
        to push downward past natural equilibrium — not possible with a hoist rope.
        Reduce θ to ≤ {theta_natural_deg.toFixed(1)}°, or set <var>y</var><sub>lp1</sub> = <var>y</var><sub>cog</sub>
        to recover the full 0–90° range.
      </p>
    {:else if off_axis_warning}
      <p class="advisory-note" style="font-size: 0.82rem;">
        <strong>Note:</strong> one or both lift points are off the COG centerline (<var>y</var><sub>lp</sub> ≠ <var>y</var><sub>cog</sub>).
        The calc uses the full 2-D moment-balance formula — load share now changes with θ
        (not constant) because the tail pick's y-offset contributes a non-zero perpendicular arm.
        Natural hang for this geometry: <strong>θ<sub>natural</sub> = {theta_natural_deg.toFixed(1)}°</strong>.
      </p>
    {/if}

    <button type="button" class="btn-small btn-secondary" style="margin-top: 0.4rem;"
            onclick={resetGeometryDefaults}>
      ↺ Reset geometry to defaults
    </button>
  </section>

  <!-- 2. GEOMETRY -->
  <section class="card geometry-panel">
    <h2>2. Geometry</h2>

    <!-- ROTATION θ control (drives the "Current" view) -->
    <div class="input-section" style="margin-bottom: 1rem;">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Rotation <var>θ</var></p>
        <span class="auto-hint">0° = horizontal start; 90° = upright (head above COG, tail at bottom)</span>
      </div>
      <div style="display: grid; grid-template-columns: 180px 1fr; column-gap: 2.5rem; align-items: end;">
        <label class="field">
          <span class="field-name"><var>θ</var> [°]</span>
          <input type="number" step="1" min="0" max="90" bind:value={theta_deg}
                 class:theta-invalid={theta_not_achievable || cog_past_head} />
          {#if theta_not_achievable && !cog_past_head}
            <span class="theta-invalid-note">past natural hang ({theta_natural_deg.toFixed(1)}°)</span>
          {/if}
        </label>
        <label class="field field-wide">
          <input type="range" min="0" max="90" step="1" bind:value={theta_deg}
                 class:theta-invalid={theta_not_achievable || cog_past_head} />
        </label>
      </div>
    </div>

    <div class="geometry-trio">
      <div class="geo-cell">
        <h4>Start &nbsp;<span class="geo-angle">θ = 0°</span></h4>
        <GeometryMode2 {L_m} {H_m} {x_cog} {y_cog}
                       {x_lp1} {y_lp1} {x_lp2} {y_lp2}
                       {Y1_m} theta_deg={0} />
      </div>
      <div class="geo-cell">
        <h4>Current &nbsp;<span class="geo-angle">θ = {theta_deg}°</span></h4>
        <GeometryMode2 {L_m} {H_m} {x_cog} {y_cog}
                       {x_lp1} {y_lp1} {x_lp2} {y_lp2}
                       {Y1_m} {theta_deg} />
      </div>
      <div class="geo-cell">
        <h4>End &nbsp;<span class="geo-angle">θ = 90°</span></h4>
        <GeometryMode2 {L_m} {H_m} {x_cog} {y_cog}
                       {x_lp1} {y_lp1} {x_lp2} {y_lp2}
                       {Y1_m} theta_deg={90} />
      </div>
    </div>

  </section>

  <!-- 3. RESULTS (chart moved here, side-by-side with table) -->
  <section class="card">
    <h2>3. Results</h2>

    <div class="results-row">
      <div class="results-table-wrap">
    <table class="results-table">
      <thead>
        <tr>
          <th>Angle <var>θ</var></th>
          <th><var>F</var><sub>head</sub> [kg]</th>
          <th>% of <var>M</var></th>
          <th><var>F</var><sub>tail</sub> [kg]</th>
          <th>% of <var>M</var></th>
        </tr>
      </thead>
      <tbody>
        {#each key_results as r, i}
          <tr class:divider={i === 0 || i === key_results.length - 1} class:worst={r.theta === 90}>
            <td>
              {r.theta}° <span class="muted" style="font-style: italic; font-size: 0.85em;">— {r.label}</span>
            </td>
            <td>{r.F_head_kg.toFixed(0)}</td>
            <td>{((r.F_head_kg / M_kg) * 100).toFixed(0)}%</td>
            <td>{r.F_tail_kg.toFixed(0)}</td>
            <td>{((r.F_tail_kg / M_kg) * 100).toFixed(0)}%</td>
          </tr>
        {/each}
        <tr style="background: #fafbfc;">
          <td><var>θ</var> = {theta_deg}° <span class="muted" style="font-size: 0.85em;">(slider — interactive)</span></td>
          <td>{r_now.F_head_kg.toFixed(0)}</td>
          <td>{((r_now.F_head_kg / M_kg) * 100).toFixed(0)}%</td>
          <td>{r_now.F_tail_kg.toFixed(0)}</td>
          <td>{((r_now.F_tail_kg / M_kg) * 100).toFixed(0)}%</td>
        </tr>
        <tr class="governing">
          <td>Governing</td>
          <td colspan="4" style="text-align: left;">
            Head crane sized for full load at <var>θ</var> = 90° → <var>F</var><sub>head</sub> = <var>M</var> = {M_kg.toFixed(0)} kg
          </td>
        </tr>
      </tbody>
    </table>
    <p class="support-note">
      Three key angles: <strong>0° (start) / 76° (near-vertical) / 90° (upright)</strong>.
      AS 2550.1 §6.28: at upright (<var>θ</var> = 90°) the head crane carries the entire mass.
    </p>
      </div>

      <div class="results-chart-wrap">
        <h3>
          Per-crane load <var>F</var> vs <var>θ</var> (0–90°)
        </h3>
        <p style="font-size: 0.82rem; color: var(--text-light); margin: 0 0 0.5rem;">
          Vertical marker tracks current slider <var>θ</var> = {theta_deg}°.
        </p>
        <ChartFvTheta {M_kg} {dx_m} {dy_m} {dxt_m} {dyt_m} {theta_deg} />
      </div>
    </div>

    <div class="action-row">
      <button class="btn-small btn-secondary" onclick={exportCsv}>Export CSV</button>
      <button class="btn-small" onclick={saveCase}>Save case (JSON)</button>
      <button class="btn-small" onclick={() => window.print()}>Print / Save as PDF</button>
    </div>
  </section>

  <!-- 4. METHOD OF CALCULATION -->
  <section class="card">
    <h2>4. Method of calculation</h2>

    <div class="method-block">
      <div class="method-group">
        <h3>Tailing geometry (head crane stationary, tail crane walks load upright)</h3>
        <p style="font-family: -apple-system, sans-serif; font-size: 0.86rem; color: var(--text); margin: 0.2rem 0 0.5rem;">
          The head crane stays fixed above its lift point; the tail crane walks horizontally so the load
          rotates about the head pick by angle <var>θ</var>. Taking moments about the head and tail lift points:
        </p>
        <span class="formula"><var>F</var><sub>head</sub> = <var>M</var> · [ <var>X</var><sub>2</sub> · cos <var>θ</var> + <var>Y</var><sub>1</sub> · sin <var>θ</var> ] / ( <var>X</var><sub>1</sub> + <var>X</var><sub>2</sub> ) · cos <var>θ</var>  +  weight beyond head</span>
        <span class="formula"><var>F</var><sub>tail</sub> = <var>M</var> · <var>X</var><sub>1</sub> · cos <var>θ</var> / [ ( <var>X</var><sub>1</sub> + <var>X</var><sub>2</sub> ) · cos <var>θ</var>  +  <var>Y</var><sub>1</sub> · sin <var>θ</var> ]</span>
        <p style="font-family: -apple-system, sans-serif; font-size: 0.84rem; color: var(--text-light); margin: 0.4rem 0 0;">
          Validated against 27 XLSX rows in <code>tests/vectors/</code>. See <code>web/src/lib/calc/mode2.ts</code> for the
          implementation form (algebraically equivalent).
        </p>
      </div>

      <div class="method-group">
        <h3>Three-key-angle assessment</h3>
        <span class="formula">Assess load share at <var>θ</var> ∈ {'{'} 0°, 76°, 90° {'}'}</span>
        <p style="font-family: -apple-system, sans-serif; font-size: 0.84rem; color: var(--text); margin: 0.4rem 0 0;">
          <strong>0°</strong> — start, lever-rule split (no <var>Y</var><sub>1</sub> contribution).<br>
          <strong>76°</strong> — near-vertical, tail crane still actively engaged; captures the late-phase load state before final stand-up.<br>
          <strong>90°</strong> — upright; head crane carries entire mass <var>M</var> (per AS 2550.1 §6.28).
        </p>
      </div>

      <div class="method-group">
        <h3>Symbol legend</h3>
        <dl class="definition">
          <dt><var>M</var></dt><dd>total mass of load [kg]</dd>
          <dt><var>X</var><sub>1</sub></dt><dd>horizontal distance from head lift point to COG along load axis [m]</dd>
          <dt><var>X</var><sub>2</sub></dt><dd>horizontal distance from tail lift point to COG along load axis [m]</dd>
          <dt><var>Y</var><sub>1</sub></dt><dd>perpendicular offset of tail lug from load axis [m] (must be &gt; 0)</dd>
          <dt><var>θ</var></dt><dd>rotation angle from horizontal [°]; 0° start, 90° upright</dd>
        </dl>
      </div>
    </div>
  </section>

  <!-- 5. REFERENCES -->
  <section class="card">
    <h2>5. References</h2>
    <ul class="references-list">
      <li>
        <span class="ref-code">AS 2550.1-2011</span>
        <span class="ref-desc">
          Cranes, hoists and winches — Safe use — Part 1: General requirements
          <span class="ref-clause">§6.28 Multiple hoist or crane operation</span>
        </span>
      </li>
      <li>
        <span class="ref-code">ISO 12480-1:2024</span>
        <span class="ref-desc">
          Cranes — Safe use — Part 1: General
          <span class="ref-clause">§8.1 Lifting with multiple cranes or multiple hoists — esp. §8.1.1 a–f, §8.1.3 Supervision, §8.1.4 Coordination of crane motions</span>
        </span>
      </li>
      <li>
        <span class="ref-code">ICSA N002 (Apr 2016)</span>
        <span class="ref-desc">
          Lifting a Load with Several Mobile Cranes (Multiple Crane Lifts) — FEM industry consensus
          <span class="ref-clause">Tailing operations are excluded from the FEM dynamic-allowance scope; this calc is purely geometric.</span>
        </span>
      </li>
    </ul>
  </section>
</div>
