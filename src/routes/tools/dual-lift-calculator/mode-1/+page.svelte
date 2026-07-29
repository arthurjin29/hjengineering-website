<!-- web/src/routes/mode-1/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { computeStatic, computeDynamic, computeLanding, checkGeometry, checkStraddle } from '$lib/dual-lift-calc/mode1';
  import GeometryMode1 from '$lib/dual-lift-calc/GeometryMode1.svelte';
  import ChartFvA from '$lib/dual-lift-calc/ChartFvA.svelte';

  // Load (primary inputs — drive defaults for everything below)
  let M_kg = $state(50000);
  let L_m = $state(8.0);
  let W_m = $state(2.5);
  let H_m = $state(2.0);

  // Geometry that defaults from L, H — overridable.
  // Initial literals match the L=8, H=2 defaults above; $effect below keeps them in sync.
  let x_cog = $state(4.0);          // default: L/2
  let y_cog = $state(1.0);          // default: H/2
  let x_lp1 = $state(0);            // default: left end of top edge
  let y_lp1 = $state(2.0);          // default: top edge (H)
  let x_lp2 = $state(8.0);          // default: right end of top edge
  let y_lp2 = $state(2.0);          // default: top edge (H)
  let x_s1  = $state(0);            // default: left end of bottom edge
  let y_s1  = $state(0);            // default: bottom edge (0)
  let x_s2  = $state(8.0);          // default: right end of bottom edge
  let y_s2  = $state(0);            // default: bottom edge (0)

  // Track which dependents the user has manually edited.
  let manual = $state({
    x_cog: false, y_cog: false,
    x_lp1: false, y_lp1: false, x_lp2: false, y_lp2: false,
    x_s1: false,  y_s1: false,  x_s2: false,  y_s2: false,
  });

  // Auto-resync dependents on L change (x-coordinates and right-end positions)
  $effect(() => {
    L_m;
    if (!manual.x_cog) x_cog = L_m / 2;
    if (!manual.x_lp1) x_lp1 = 0;
    if (!manual.x_lp2) x_lp2 = L_m;
    if (!manual.x_s1)  x_s1  = 0;
    if (!manual.x_s2)  x_s2  = L_m;
  });
  // Auto-resync y-coordinates on H change
  $effect(() => {
    H_m;
    if (!manual_h) h_m = Math.max(H_m / 2, 0.1);
    if (!manual.y_cog) y_cog = H_m / 2;
    if (!manual.y_lp1) y_lp1 = H_m;
    if (!manual.y_lp2) y_lp2 = H_m;
    if (!manual.y_s1)  y_s1  = 0;
    if (!manual.y_s2)  y_s2  = 0;
  });

  function resetGeometryDefaults() {
    for (const k of Object.keys(manual) as (keyof typeof manual)[]) manual[k] = false;
    x_cog = L_m / 2; y_cog = H_m / 2;
    x_lp1 = 0;       y_lp1 = H_m;
    x_lp2 = L_m;     y_lp2 = H_m;
    x_s1  = 0;       y_s1  = 0;
    x_s2  = L_m;     y_s2  = 0;
  }

  // Inclination tolerance
  let alpha_deg = $state(2.5);
  let manual_h = $state(false);

  // Derived calc inputs
  let a1_m = $derived(Math.abs(x_cog - x_lp1));
  let a2_m = $derived(Math.abs(x_cog - x_lp2));
  // h = height of the HOOK above the COG. A rigging property -- sling length and
  // lift-point geometry -- so it is entered, not derived from the lug positions.
  //
  // It was previously derived from the lug Y coordinates, which is the wrong
  // quantity for the usual arrangement: two lift points per crane under a
  // two-leg sling, hook above the COG, lugs possibly BELOW it (basketed loads,
  // containers taken from the bottom corners). Those rigs are perfectly stable
  // and the lug elevation says nothing about h. The lug Y inputs now feed the
  // geometry drawing only.
  let h_m = $state(1.0);
  let X_s1_m = $derived(Math.abs(x_cog - x_s1));
  let X_s2_m = $derived(Math.abs(x_cog - x_s2));

  // Geometry gate. Three configurations are arithmetically defined but
  // physically meaningless, and each one used to produce a plausible-looking
  // number: a suspension plane at or below the CoG (allowance floored to 0%), a
  // negative tolerance (same, by another route), and a lift point coincident
  // with the CoG (Infinity / "NaN t"). Results are withheld with the reason
  // shown, never clamped.
  // a1/a2/X_s are magnitudes, so the side of the COG each point sits on is lost
  // before checkGeometry can see it. Two lift points on the same side still give
  // positive arms and a plausible split, but equilibrium then requires one crane
  // to pull down. Straddle is checked here, where the x-coordinates still exist.
  let geom_err = $derived(
    checkStraddle(x_cog, x_lp1, x_lp2, 'lift points')
    ?? checkStraddle(x_cog, x_s1, x_s2, 'landing supports')
    ?? checkGeometry({ M_kg, a1_m, a2_m, alpha_deg, X_s1_m, X_s2_m, h_m })
  );
  let geom_ok = $derived(geom_err === null);

  let stat = $derived(geom_ok ? computeStatic({ M_kg, a1_m, a2_m }) : null);
  let dyn = $derived(geom_ok
    ? computeDynamic({ M_kg, h_m, a1_m, a2_m, alpha_deg })
    : null);
  let landing = $derived(geom_ok
    ? computeLanding({ M_kg, a1_m, a2_m, X_s1_m, X_s2_m, h_m, alpha_deg })
    : null);


  // ─── AS 2550.1 §6.28.3 baseline + designed-lift state ────────────────────
  const K_ASYNC_BASELINE = 1.20;   // §6.28.3 (a) — two cranes, non-synchronised
  const CREDIT = { creep_speed: 0.04, lmi_both: 0.05, test_lift: 0.04, signaller: 0.03 };

  let ctl_creep_speed = $state(false);
  let ctl_lmi_both    = $state(false);
  let ctl_test_lift   = $state(false);
  let ctl_signaller   = $state(false);
  let designed_lift_ack = $state(false);

  let credit_sum = $derived(
    (ctl_creep_speed ? CREDIT.creep_speed : 0) +
    (ctl_lmi_both    ? CREDIT.lmi_both    : 0) +
    (ctl_test_lift   ? CREDIT.test_lift   : 0) +
    (ctl_signaller   ? CREDIT.signaller   : 0)
  );
  let k_async = $derived(K_ASYNC_BASELINE - credit_sum);

  // §6.28.3 baseline = static × 1.20 (applies to non-designed-lift, non-synchronised)
  let F1_628_3_kg = $derived(stat ? stat.F1_kg * K_ASYNC_BASELINE : NaN);
  let F2_628_3_kg = $derived(stat ? stat.F2_kg * K_ASYNC_BASELINE : NaN);

  // Per-crane geometric worst factor (from §3 scenarios) — F_scenario / F_static
  // Crane 1 worst geometric load comes from dynamic raise or landing-S2-first
  // Crane 2 worst geometric load comes from dynamic raise or landing-S1-first
  let c1_g_factor = $derived(!dyn || !landing ? NaN : Math.max(
    1.0,
    dyn.F1_max_kg / dyn.F1_static_kg,
    landing.S2_first.F1_prime_kg / dyn.F1_static_kg
  ));
  let c2_g_factor = $derived(!dyn || !landing ? NaN : Math.max(
    1.0,
    dyn.F2_max_kg / dyn.F2_static_kg,
    landing.S1_first.F2_prime_kg / dyn.F2_static_kg
  ));

  // Engineering lift factor — additive: k_async excess + geometric excess, both co-occur in worst case
  //   F_eng = F_static × (k_async + (g_factor − 1))
  // Defensible when reaction-lag tilt and geometric α-tilt can stack (rare for the bound
  // controls but credit table claim is the engineer's documented basis).
  let c1_eng_factor = $derived(k_async + (c1_g_factor - 1));
  let c2_eng_factor = $derived(k_async + (c2_g_factor - 1));
  let F1_DL_kg = $derived(stat ? stat.F1_kg * c1_eng_factor : NaN);
  let F2_DL_kg = $derived(stat ? stat.F2_kg * c2_eng_factor : NaN);

  // Final governing — depends on designed-lift toggle
  let F1_governing_kg = $derived(designed_lift_ack ? F1_DL_kg : F1_628_3_kg);
  let F2_governing_kg = $derived(designed_lift_ack ? F2_DL_kg : F2_628_3_kg);


  function saveCase() {
    const c = {
      schema_version: 2,
      mode: 'mode1',
      inputs: {
        M_kg, L_m, W_m, H_m,
        x_cog, y_cog,
        x_lp1, y_lp1, x_lp2, y_lp2,
        x_s1,  y_s1,  x_s2,  y_s2,
        alpha_deg,
        // derived (CLI compatibility)
        a1_m, a2_m, h_m, X_s1_m, X_s2_m
      }
    };
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dual-lift-mode1.case.json'; a.click();
    URL.revokeObjectURL(url);
  }

  onMount(() => {
    const raw = sessionStorage.getItem('dual-lift-case');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.mode === 'mode1') {
        M_kg = data.inputs.M_kg ?? M_kg;
        L_m = data.inputs.L_m ?? L_m;
        W_m = data.inputs.W_m ?? W_m;
        H_m = data.inputs.H_m ?? H_m;
        // Treat any loaded geometry value as a manual override
        if (data.inputs.x_cog != null) { x_cog = data.inputs.x_cog; manual.x_cog = true; }
        if (data.inputs.y_cog != null) { y_cog = data.inputs.y_cog; manual.y_cog = true; }
        if (data.inputs.x_lp1 != null) { x_lp1 = data.inputs.x_lp1; manual.x_lp1 = true; }
        if (data.inputs.y_lp1 != null) { y_lp1 = data.inputs.y_lp1; manual.y_lp1 = true; }
        if (data.inputs.x_lp2 != null) { x_lp2 = data.inputs.x_lp2; manual.x_lp2 = true; }
        if (data.inputs.y_lp2 != null) { y_lp2 = data.inputs.y_lp2; manual.y_lp2 = true; }
        if (data.inputs.x_s1  != null) { x_s1  = data.inputs.x_s1;  manual.x_s1  = true; }
        if (data.inputs.y_s1  != null) { y_s1  = data.inputs.y_s1;  manual.y_s1  = true; }
        if (data.inputs.x_s2  != null) { x_s2  = data.inputs.x_s2;  manual.x_s2  = true; }
        if (data.inputs.y_s2  != null) { y_s2  = data.inputs.y_s2;  manual.y_s2  = true; }
        // The number input clamps 0-15; a loaded case must not bypass it.
        const a = data.inputs.alpha_deg;
        if (a != null && Number.isFinite(a)) alpha_deg = Math.min(15, Math.max(0, a));
      }
    } finally {
      sessionStorage.removeItem('dual-lift-case');
    }
  });
</script>

<div class="mode-stack">

  <!-- 1. INPUTS -->
  <section class="card scope-note">
    <p>
      <strong>Scope.</strong> This tool computes <strong>load share</strong> between
      two cranes. It does <strong>not</strong> assess rigging stability, sling or
      lift-point design. A typical arrangement has two lift points per crane under a
      two-leg sling: the hook sits above the centre of gravity and the lugs may sit
      below it — a basketed load, or a container taken from its bottom corners — and
      that is stable and ordinary. Stability, sling design and lift-point adequacy
      remain the rigging engineer's.
    </p>
    <p class="muted">
      Enter <var>a</var><sub>1</sub>, <var>a</var><sub>2</sub> and <var>h</var> at each
      crane's <strong>effective suspension point</strong> — the bridle apex where a
      crane is bridled to two lugs, not either lug. <var>h</var> is the height of the
      hook above the COG.
    </p>
  </section>

  <section class="card">
    <h2>1. Inputs</h2>

    <div class="inputs-grid">
    <div class="inputs-col">

    <div class="input-section">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Load</p>
      </div>
      <div class="input-row cols-4">
        <label class="field">
          <span class="field-name">Mass <var>M</var> [kg]</span>
          <input type="number" bind:value={M_kg} />
          <span class="field-help">Total weight of the load (including rigging hardware attached).</span>
        </label>
        <label class="field">
          <span class="field-name">Length <var>L</var> [m]</span>
          <input type="number" step="0.1" bind:value={L_m} />
          <span class="field-help">Side-view length of the load.</span>
        </label>
        <label class="field">
          <span class="field-name">Width <var>W</var> [m]</span>
          <input type="number" step="0.1" bind:value={W_m} />
          <span class="field-help">Depth into the page.</span>
        </label>
        <label class="field">
          <span class="field-name">Height <var>H</var> [m]</span>
          <input type="number" step="0.1" bind:value={H_m} />
          <span class="field-help">Base to top.</span>
        </label>
      </div>
    </div>

    <div class="input-section">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Centre of gravity</p>
        <span class="auto-hint">defaults to geometric centre</span>
      </div>
      <div class="input-row cols-2">
        <label class="field">
          <span class="field-name">
            <var>x</var><sub>cog</sub> [m]
            {#if !manual.x_cog}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={x_cog} min="0" max={L_m}
                 oninput={() => manual.x_cog = true} />
          <span class="field-help">LEFT end of load to COG, along <var>L</var>.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>y</var><sub>cog</sub> [m]
            {#if !manual.y_cog}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={y_cog} min="0" max={H_m}
                 oninput={() => manual.y_cog = true} />
          <span class="field-help">Above BASE. Uniform beam ≈ <var>H</var>/2.</span>
        </label>
      </div>
    </div>

    <div class="input-section">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Rigging</p>
      </div>
      <div class="input-row cols-4">
        <label class="field">
          <span class="field-name">
            <var>h</var> [m]
            {#if !manual_h}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={h_m}
                 oninput={() => manual_h = true} />
          <span class="field-help">Height of the HOOK above the COG — sling length and lift-point geometry. Not a lug elevation: lugs may sit below the COG.</span>
        </label>
      </div>

      <div class="input-section-header">
        <p class="label" style="margin: 0;">Lift points (Crane 1 &amp; Crane 2)</p>
        <span class="auto-hint">effective suspension point per crane</span>
      </div>
      <div class="input-row cols-4">
        <label class="field">
          <span class="field-name">
            <var>x</var><sub>lp1</sub> [m]
            {#if !manual.x_lp1}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={x_lp1} min="0" max={L_m}
                 oninput={() => manual.x_lp1 = true} />
          <span class="field-help">Crane 1 lug — horizontal position from LEFT end.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>y</var><sub>lp1</sub> [m]
            {#if !manual.y_lp1}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={y_lp1} min="0"
                 oninput={() => manual.y_lp1 = true} />
          <span class="field-help">Crane 1 lug — height above BASE. Default top edge = <var>H</var>.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>x</var><sub>lp2</sub> [m]
            {#if !manual.x_lp2}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={x_lp2} min="0" max={L_m}
                 oninput={() => manual.x_lp2 = true} />
          <span class="field-help">Crane 2 lug — horizontal. Must be &gt; <var>x</var><sub>lp1</sub>.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>y</var><sub>lp2</sub> [m]
            {#if !manual.y_lp2}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={y_lp2} min="0"
                 oninput={() => manual.y_lp2 = true} />
          <span class="field-help">Crane 2 lug — height above BASE.</span>
        </label>
      </div>
    </div>

    <div class="input-section">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Landing supports (S₁ &amp; S₂)</p>
        <span class="auto-hint">default to load bottom corners</span>
      </div>
      <div class="input-row cols-4">
        <label class="field">
          <span class="field-name">
            <var>x</var><sub>s1</sub> [m]
            {#if !manual.x_s1}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={x_s1}
                 oninput={() => manual.x_s1 = true} />
          <span class="field-help">S₁ left support — horizontal position.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>y</var><sub>s1</sub> [m]
            {#if !manual.y_s1}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={y_s1}
                 oninput={() => manual.y_s1 = true} />
          <span class="field-help">S₁ height above BASE. Default bottom edge = 0.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>x</var><sub>s2</sub> [m]
            {#if !manual.x_s2}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={x_s2}
                 oninput={() => manual.x_s2 = true} />
          <span class="field-help">S₂ right support — horizontal position.</span>
        </label>
        <label class="field">
          <span class="field-name">
            <var>y</var><sub>s2</sub> [m]
            {#if !manual.y_s2}<span class="auto-badge">auto</span>{/if}
          </span>
          <input type="number" step="0.1" bind:value={y_s2}
                 oninput={() => manual.y_s2 = true} />
          <span class="field-help">S₂ height above BASE.</span>
        </label>
      </div>
    </div>

    <button type="button" class="btn-small btn-secondary" style="margin-top: 0.4rem;"
            onclick={resetGeometryDefaults}>
      ↺ Reset geometry to defaults
    </button>

    </div><!-- /.inputs-col -->

    <div class="baseline-col">
      <div class="baseline-card-inline">
        <h3 class="baseline-card-title">Static share + compliance baseline</h3>
        <p class="card-sub">non-synchronised, 2 cranes — compliance default</p>
        <table class="baseline-table">
          <thead>
            <tr><th></th><th>Crane 1 (LP1)</th><th>Crane 2 (LP2)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><var>F</var><sub>static</sub> &nbsp; <span class="muted">(lever rule)</span></td>
              <td>{stat ? (stat.F1_kg / 1000).toFixed(2) + ' t' : '—'}</td>
              <td>{stat ? (stat.F2_kg / 1000).toFixed(2) + ' t' : '—'}</td>
            </tr>
            <tr class="emph">
              <td>Compliance baseline &nbsp; <span class="muted">(× 1.20)</span></td>
              <td>{stat ? (F1_628_3_kg / 1000).toFixed(2) + ' t' : '—'}</td>
              <td>{stat ? (F2_628_3_kg / 1000).toFixed(2) + ' t' : '—'}</td>
            </tr>
          </tbody>
        </table>
        <p class="baseline-note">
          For two cranes where motions are not synchronised, each crane shall be sized for
          <strong>20 % greater than the calculated share</strong>. This is the compliance default
          unless a documented designed lift is applied — see §4. Clause provenance in §6 References.
        </p>
      </div>
    </div><!-- /.baseline-col -->

    </div><!-- /.inputs-grid -->
  </section>


  {#if geom_err}
    <section class="card unstable-rig" role="alert">
      <h2>
        {geom_err.code === 'invalid_suspension_height' ? 'Hook-to-CoG height out of range' :
         geom_err.code === 'invalid_tolerance' ? 'Inclination tolerance out of range' :
         geom_err.code === 'invalid_mass' ? 'Load mass not valid' :
         geom_err.code === 'invalid_support' ? 'Landing support position not valid' :
         geom_err.code === 'lift_points_same_side' ? 'Load is not straddled' :
         'Lift point coincides with the centre of gravity'} — results withheld
      </h2>
      <p>{geom_err.message}</p>
      <p class="muted">
        Sections 2 to 4 are withheld until the geometry is one this method can be
        applied to. These configurations are arithmetically defined but physically
        meaningless — a number here would look like an answer without being one.
      </p>
      {#if geom_err.code === 'invalid_tolerance'}
        <!-- The α control lives in §2, which is withheld — without this the
             user cannot reach the input that is causing the refusal. -->
        <button class="btn-small" onclick={() => (alpha_deg = 2.5)}>
          Reset α to 2.5°
        </button>
      {/if}
    </section>
  {:else if stat && dyn && landing}
  <!-- 2. GEOMETRY + CHART (α lives here — it directly drives the geometry tilt + the chart) -->
  <section class="card geometry-panel">
    <h2>2. Geometry</h2>
    <GeometryMode1 {L_m} {H_m} {x_cog} {y_cog}
                   {x_lp1} {y_lp1} {x_lp2} {y_lp2}
                   {x_s1} {y_s1} {x_s2} {y_s2}
                   {alpha_deg} />

    <div class="alpha-chart-row">
      <div class="alpha-controls">
        <h3>Dynamic raise tolerance <var>α</var></h3>
        <div class="alpha-readout">
          <input type="number" step="0.1" min="0" max="15" bind:value={alpha_deg} class="alpha-num" />
          <span class="alpha-unit">°</span>
        </div>
        <input type="range" min="0" max="15" step="0.1" bind:value={alpha_deg} class="alpha-slider" />
        <div class="alpha-ticks">
          <span>0°</span><span>5°</span><span>10°</span><span>15°</span>
        </div>
        <p class="alpha-help">
          In-plane tilt during raise (typ. 2–5°).<br>
          Live — geometry &amp; chart update with the slider.<br>
          Out-of-plane motion excluded — see §5 / §6.
        </p>
      </div>
      <div class="chart-wrap">
        <h3>Per-crane factor <var>F</var>/<var>F</var><sub>static</sub> vs <var>α</var> (0–15°)</h3>
        <ChartFvA {h_m} {a1_m} {a2_m} {alpha_deg} />
      </div>
    </div>
  </section>

  <!-- 3. RESULTS -->
  <section class="card">
    <h2>3. Results</h2>

    <table class="results-table">
      <thead>
        <tr>
          <th>Scenario</th>
          <th>Crane 1 factor (× <var>F</var><sub>1,static</sub>)</th>
          <th>Crane 2 factor (× <var>F</var><sub>2,static</sub>)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Static (<var>α</var> = 0°)</td>
          <td>×1.000</td>
          <td>×1.000</td>
        </tr>
        <tr>
          <td>Dynamic raise (<var>α</var> = {alpha_deg}°)</td>
          <td>×{(dyn.F1_max_kg / dyn.F1_static_kg).toFixed(3)}</td>
          <td>×{(dyn.F2_max_kg / dyn.F2_static_kg).toFixed(3)}</td>
        </tr>
        <tr>
          <td>Landing — R support (S₂) first (<var>α</var> = {alpha_deg}°)</td>
          <td>×{(landing.S2_first.F1_prime_kg / dyn.F1_static_kg).toFixed(3)}</td>
          <td class="muted">—</td>
        </tr>
        <tr>
          <td>Landing — L support (S₁) first (<var>α</var> = {alpha_deg}°)</td>
          <td class="muted">—</td>
          <td>×{(landing.S1_first.F2_prime_kg / dyn.F2_static_kg).toFixed(3)}</td>
        </tr>
        <tr class="divider worst">
          <td><strong>Geometric worst factor</strong> &nbsp;<span class="muted">→ used by §4</span></td>
          <td><strong>×{c1_g_factor.toFixed(3)}</strong></td>
          <td><strong>×{c2_g_factor.toFixed(3)}</strong></td>
        </tr>
      </tbody>
    </table>

    <p class="advisory-note">
      <strong>Factor basis (geometric only).</strong> Each factor = <var>F</var><sub>scenario</sub> / <var>F</var><sub>static</sub>.
      The chart in §2 plots these same factors continuously over <var>α</var>. The rated-capacity chart
      already includes the single-crane hoist dynamic factor — do not multiply this geometric worst factor
      by a hoist dynamic factor again, or you will double-count. The multi-crane asynchrony margin is
      applied separately in §4. Clause provenance in §6 References.
    </p>

    <div class="action-row">
      <button class="btn-small" onclick={saveCase}>Save case (JSON)</button>
      <button class="btn-small" onclick={() => window.print()}>Print / Save as PDF</button>
    </div>
  </section>

  <!-- 4. PER-CRANE FACTORED LOAD — designed-lift refinement (gated on toggle) -->
  <section class="card">
    <h2>4. Per-crane factored load</h2>

    <div class="input-section">
      <div class="input-section-header">
        <p class="label" style="margin: 0;">Designed-lift acknowledgement</p>
      </div>
      <label class="dl-toggle">
        <input type="checkbox" bind:checked={designed_lift_ack} />
        <span>
          Designed lift documented — competent person + third-party review recorded in lift plan.
        </span>
      </label>
      <p class="baseline-note">
        Off → governing per crane uses the compliance baseline from §1 (<var>F</var><sub>static</sub> × 1.20).
        On → the engineering lift below replaces the baseline.
        Clause provenance in §6 References.
      </p>
    </div>

    {#if designed_lift_ack}
      <div class="input-section">
        <div class="input-section-header">
          <p class="label" style="margin: 0;">In-flight asynchrony envelope <var>k</var><sub>async</sub></p>
          <span class="auto-hint">designed-lift, non-synchronised — engineering controls credit</span>
        </div>
        <table class="credit-table">
          <thead>
            <tr><th></th><th>Engineering control</th><th class="credit-col">Credit</th></tr>
          </thead>
          <tbody>
            <tr>
              <td class="check-cell"><input type="checkbox" bind:checked={ctl_creep_speed} /></td>
              <td>Crane operating in creep speed mode</td>
              <td class="credit-col">−4 %</td>
            </tr>
            <tr>
              <td class="check-cell"><input type="checkbox" bind:checked={ctl_lmi_both} /></td>
              <td>LMI on both cranes, load reviewed against calculated share ±5 %</td>
              <td class="credit-col">−5 %</td>
            </tr>
            <tr>
              <td class="check-cell"><input type="checkbox" bind:checked={ctl_test_lift} /></td>
              <td>Documented test lift</td>
              <td class="credit-col">−4 %</td>
            </tr>
            <tr>
              <td class="check-cell"><input type="checkbox" bind:checked={ctl_signaller} /></td>
              <td>Dedicated signaller, scripted comms, LOS to both operators</td>
              <td class="credit-col">−3 %</td>
            </tr>
            <tr class="credit-sum-row">
              <td colspan="2">
                Baseline 1.20 − credit {(credit_sum * 100).toFixed(0)} %
                →&nbsp; <strong><var>k</var><sub>async</sub> = {k_async.toFixed(2)}</strong>
              </td>
              <td class="credit-col"><strong>+{((k_async - 1) * 100).toFixed(0)} %</strong></td>
            </tr>
          </tbody>
        </table>
        <p class="baseline-note">
          <var>k</var><sub>async</sub> envelopes the <strong>in-flight</strong> asynchrony hazards
          only — operator reaction lag during hoist, initial COG uncertainty, comms delay.
          The engineering lift is the <strong>additive</strong> combination of <var>k</var><sub>async</sub>
          excess and the geometric worst factor from §3, since the two hazards can stack in the worst case
          (reaction-lag tilt building on top of an α-induced load shift). Each credit reduction is the
          engineer's documented basis for the claim.
        </p>
      </div>

      <table class="results-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Crane 1 (LP1)</th>
            <th>Crane 2 (LP2)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Engineering lift
              <div class="sub-detail">
                <var>F</var><sub>static</sub> × [<var>k</var><sub>async</sub> + (<var>g</var><sub>worst</sub> − 1)]
                &nbsp;(additive — in-flight + geometric)
              </div>
            </td>
            <td>
              {(F1_DL_kg / 1000).toFixed(2)} t
              <div class="sub-detail">
                ×{c1_eng_factor.toFixed(3)} = {k_async.toFixed(2)} + ({c1_g_factor.toFixed(3)} − 1)
              </div>
            </td>
            <td>
              {(F2_DL_kg / 1000).toFixed(2)} t
              <div class="sub-detail">
                ×{c2_eng_factor.toFixed(3)} = {k_async.toFixed(2)} + ({c2_g_factor.toFixed(3)} − 1)
              </div>
            </td>
          </tr>
          <tr class="divider governing">
            <td>Governing per crane</td>
            <td><strong>{(F1_governing_kg / 1000).toFixed(2)} t</strong></td>
            <td><strong>{(F2_governing_kg / 1000).toFixed(2)} t</strong></td>
          </tr>
        </tbody>
      </table>
    {/if}
  </section>

  {/if}

  <!-- 5. METHOD OF CALCULATION -->
  <section class="card">
    <h2>5. Method of calculation</h2>

    {#if geom_err}
      <p class="method-not-applicable">
        The current geometry is not one this method applies to (see above). The
        formulae below are shown for reference only — the derived values in them
        are not a valid load assessment.
      </p>
    {/if}

    <div class="method-block">
      <div class="method-group">
        <h3>Derived geometry</h3>
        <span class="formula"><var>a</var><sub>1</sub> = |<var>x</var><sub>cog</sub> − <var>x</var><sub>lp1</sub>| = {a1_m.toFixed(2)} m</span>
        <span class="formula"><var>a</var><sub>2</sub> = |<var>x</var><sub>cog</sub> − <var>x</var><sub>lp2</sub>| = {a2_m.toFixed(2)} m</span>
        <span class="formula">span = <var>a</var><sub>1</sub> + <var>a</var><sub>2</sub> = {(a1_m + a2_m).toFixed(2)} m</span>
        <span class="formula"><var>h</var> = {h_m.toFixed(2)} m  (entered — height of the hook above the COG; a rigging property, not a lug elevation)</span>
        <span class="formula"><var>X</var><sub>s1</sub> = |<var>x</var><sub>cog</sub> − <var>x</var><sub>s1</sub>| = {X_s1_m.toFixed(2)} m  ;  <var>X</var><sub>s2</sub> = |<var>x</var><sub>cog</sub> − <var>x</var><sub>s2</sub>| = {X_s2_m.toFixed(2)} m</span>
      </div>

      <div class="method-group">
        <h3>Static load share — lever rule about the COG (ropes plumb)</h3>
        <span class="formula"><var>F</var><sub>1,static</sub> = <var>M</var> · <var>a</var><sub>2</sub> / span</span>
        <span class="formula"><var>F</var><sub>2,static</sub> = <var>M</var> · <var>a</var><sub>1</sub> / span</span>
      </div>

      <div class="method-group">
        <h3>Dynamic raise — in-plane tilt up to <var>α</var> (ICSA N002 Annex 1)</h3>
        <span class="formula">shift = <var>h</var> · tan <var>α</var> = {(h_m * Math.tan(alpha_deg * Math.PI / 180)).toFixed(3)} m  (horizontal COG swing for the worst tilt)</span>
        <span class="formula"><var>F</var><sub>1,max</sub> = <var>M</var> · (<var>a</var><sub>2</sub> + shift) / span    (COG swings toward Crane 1)</span>
        <span class="formula"><var>F</var><sub>2,max</sub> = <var>M</var> · (<var>a</var><sub>1</sub> + shift) / span    (COG swings toward Crane 2, opposite tilt)</span>
        <p style="font-family: -apple-system, sans-serif; font-size: 0.84rem; color: var(--text-light); margin: 0.4rem 0 0;">
          Each formula represents the worst direction of tilt <em>for that crane</em>; they are not simultaneous.
        </p>
      </div>

      <div class="method-group">
        <h3>Sequential set-down — landing scenarios (ICSA N002 Annex 2, α-augmented)</h3>
        <span class="formula">shift = <var>h</var> · tan <var>α</var>  (COG horizontal swing during asynchronous descent — same form as raise)</span>
        <span class="formula">If S₂ touches first (load pivots about S₂):</span>
        <span class="formula">  <var>F</var><sub>1</sub>′ = <var>M</var> · (<var>X</var><sub>s2</sub> + shift) / (<var>a</var><sub>1</sub> + <var>X</var><sub>s2</sub>)  ;  <var>S</var><sub>2</sub>′ = <var>M</var> − <var>F</var><sub>1</sub>′</span>
        <span class="formula">If S₁ touches first (load pivots about S₁):</span>
        <span class="formula">  <var>F</var><sub>2</sub>′ = <var>M</var> · (<var>X</var><sub>s1</sub> + shift) / (<var>a</var><sub>2</sub> + <var>X</var><sub>s1</sub>)  ;  <var>S</var><sub>1</sub>′ = <var>M</var> − <var>F</var><sub>2</sub>′</span>
        <p style="font-family: -apple-system, sans-serif; font-size: 0.84rem; color: var(--text-light); margin: 0.4rem 0 0;">
          Real-world landings are almost never perfectly symmetric — one end touches first, intentionally or otherwise.
          The COG-swing term <em>h</em>·tan <em>α</em> captures the asynchronous descent <em>before</em> touchdown,
          consistent with the in-plane asynchrony allowance used for the raise. With <em>α</em> = 0 the formulas reduce
          to the pure ICSA N002 Annex 2 expressions.
        </p>
      </div>

      <div class="method-group">
        <h3>Overall geometric worst case per crane</h3>
        <span class="formula"><var>C</var><sub>n,worst</sub> = max(<var>F</var><sub>n,static</sub>, <var>F</var><sub>n,max</sub>, <var>F</var><sub>n</sub>′<sub>landing</sub>)</span>
        <span class="formula">factor<sub>n</sub> = <var>C</var><sub>n,worst</sub> / <var>F</var><sub>n,static</sub></span>
        <span class="formula">Governing = the crane with the larger factor (drives the sizing margin)</span>
      </div>

      <div class="method-group">
        <h3>Symbol legend</h3>
        <dl class="definition">
          <dt><var>M</var></dt><dd>total mass of load [kg]</dd>
          <dt><var>L</var>, <var>W</var>, <var>H</var></dt><dd>load length / depth / height [m]</dd>
          <dt><var>x</var><sub>cog</sub>, <var>y</var><sub>cog</sub></dt><dd>COG position in side view (origin = bottom-left of load) [m]</dd>
          <dt><var>x</var><sub>lp1</sub>, <var>x</var><sub>lp2</sub></dt><dd>lift-point positions on the top edge [m]</dd>
          <dt><var>x</var><sub>s1</sub>, <var>x</var><sub>s2</sub></dt><dd>landing-support positions [m]</dd>
          <dt><var>α</var></dt><dd>in-plane raise inclination tolerance [°]</dd>
          <dt><var>a</var><sub>1</sub>, <var>a</var><sub>2</sub></dt><dd>horizontal lever arm from COG to each lift point [m]</dd>
          <dt><var>h</var></dt><dd>vertical drop from lift-point plane down to COG [m]</dd>
          <dt><var>X</var><sub>s1</sub>, <var>X</var><sub>s2</sub></dt><dd>horizontal lever arm from COG to each support [m]</dd>
        </dl>
      </div>
    </div>
  </section>

  <!-- 6. REFERENCES -->
  <section class="card">
    <h2>6. References</h2>
    <ul class="references-list">
      <li>
        <span class="ref-code">AS 2550.1-2011</span>
        <span class="ref-desc">
          Cranes, hoists and winches — Safe use — Part 1: General requirements
          <span class="ref-clause">
            §6.28 Multiple hoist or crane operation;
            §6.28.3 Capacity requirements (non-synchronised: +20 % for 2 cranes — applied as baseline in §1 / §4);
            §6.28.5.5 Synchronisation of crane and crab motions + NOTE 3 (electronic synchronisation methods);
            §6.27 + §1.4.4 Designed lift — competent person authoring + third-party review (acknowledged in §4 to unlock designed-lift reduction).
          </span>
        </span>
      </li>
      <li>
        <span class="ref-code">ISO 12480-1:2024</span>
        <span class="ref-desc">
          Cranes — Safe use — Part 1: General
          <span class="ref-clause">§8.1 Lifting with multiple cranes or multiple hoists — esp. §8.1.1 a–f (planning requirements), §8.1.3 Supervision (appointed person), §8.1.4 Coordination of crane motions ("…there will always be some variation due to differences in response to the motion controller and the setting and efficiency of the braking system")</span>
        </span>
      </li>
      <li>
        <span class="ref-code">ICSA N002 (Apr 2016)</span>
        <span class="ref-desc">
          Lifting a Load with Several Mobile Cranes (Multiple Crane Lifts) — FEM industry consensus
          <span class="ref-clause">Annex 1 — FEM dynamic allowance (the <var>h</var>·tan <var>α</var> model implemented here); Annex 2 — sequential set-down asymmetry</span>
        </span>
      </li>
      <li>
        <span class="ref-code">AS 5221.1:2021</span>
        <span class="ref-desc">
          Cranes — Design principles for loads and load combinations — Part 1: General (ISO 8686-1:2012, MOD)
          <span class="ref-clause">§6.1.2.1 hoist dynamic factor <var>φ</var><sub>2</sub> = <var>φ</var><sub>2,min</sub> + <var>β</var><sub>2</sub>·<var>v</var><sub>h</sub> — single-crane structural-design factor used by the crane manufacturer; <em>already included in the published rated-capacity chart</em>. Not applied here to avoid double-counting.</span>
        </span>
      </li>
      <li>
        <span class="ref-code">AS 1418.1:2021 §4</span>
        <span class="ref-desc">
          Cranes, hoists and winches — General requirements
          <span class="ref-clause">§4.2 defers all load combinations to AS 5221.1. Standalone dynamic factor clauses from AS 1418.1—2002 §7.4–7.9 superseded.</span>
        </span>
      </li>
      <li>
        <span class="ref-code">AS 1418.5:2013 §4.1.2.5</span>
        <span class="ref-desc">
          Cranes — Mobile cranes (EN 13000:2010, MOD)
          <span class="ref-clause">Defers to FEM 5.004:1994 and ISO 8686-1:1989 for working load factor Φ. Same single-crane-structural concept as AS 5221.1 <var>φ</var><sub>2</sub>; baked into chart.</span>
        </span>
      </li>
    </ul>
    <p class="standards-trace" style="margin-top: 0.9rem; font-style: italic;">
      <strong>Scope:</strong> in-plane asynchrony only (load pitching about the lift line).
      Out-of-plane motion (slew / travel / luff at different rates causing off-plumb hoist ropes
      and boom side-load) is excluded from this calc — controlled procedurally per
      ISO 12480-1 §8.1 ("hoist ropes shall remain vertical") and §8.1.3 supervision.
    </p>
  </section>
</div>
