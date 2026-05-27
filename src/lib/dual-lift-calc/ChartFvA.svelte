<!-- web/src/lib/components/ChartFvA.svelte -->
<script lang="ts">
  let { h_m, a1_m, a2_m, alpha_deg, alpha_max_deg = 15 }: {
    h_m: number; a1_m: number; a2_m: number; alpha_deg: number; alpha_max_deg?: number;
  } = $props();

  const W = 480, H = 220, P_L = 56, P_R = 22, P_T = 22, P_B = 38;
  const BASELINE_FACTOR = 1.20;  // AS 2550.1 §6.28.3 (a) — 2 cranes, non-synchronised
  const DEG = Math.PI / 180;

  // Factor curves: F_n_factor(α) = 1 + (h · tan α) / a_n
  // Independent of M; depends only on geometry.
  let curve = $derived.by(() => {
    const pts: Array<{ a: number; f1: number; f2: number }> = [];
    for (let i = 0; i <= 50; i++) {
      const a = (i / 50) * alpha_max_deg;
      const shift = h_m * Math.tan(a * DEG);
      pts.push({
        a,
        f1: a2_m > 0 ? 1 + shift / a2_m : 1,
        f2: a1_m > 0 ? 1 + shift / a1_m : 1
      });
    }
    return pts;
  });

  // Axis range — pad slightly past the larger of the curve max and the §6.28.3 line
  let f_curve_max = $derived(Math.max(...curve.map(p => Math.max(p.f1, p.f2))));
  let f_max = $derived(Math.max(f_curve_max, BASELINE_FACTOR) * 1.05);
  const f_min = 1.0;

  function x(a: number): number { return P_L + ((a / alpha_max_deg) * (W - P_L - P_R)); }
  function y(f: number): number { return H - P_B - ((f - f_min) / (f_max - f_min)) * (H - P_T - P_B); }

  let path1 = $derived(curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.a)} ${y(p.f1)}`).join(' '));
  let path2 = $derived(curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.a)} ${y(p.f2)}`).join(' '));

  // Live marker at selected α
  let marker_shift = $derived(h_m * Math.tan(alpha_deg * DEG));
  let marker_f1 = $derived(a2_m > 0 ? 1 + marker_shift / a2_m : 1);
  let marker_f2 = $derived(a1_m > 0 ? 1 + marker_shift / a1_m : 1);
  let marker_x  = $derived(x(alpha_deg));
  let marker_y1 = $derived(y(marker_f1));
  let marker_y2 = $derived(y(marker_f2));
  let marker_in_range = $derived(alpha_deg >= 0 && alpha_deg <= alpha_max_deg);
  let marker_label = $derived(Math.abs(marker_f1 - marker_f2) < 0.001
    ? `α = ${alpha_deg.toFixed(1)}° → ×${marker_f1.toFixed(3)}`
    : `α = ${alpha_deg.toFixed(1)}° → ×${marker_f1.toFixed(3)} / ×${marker_f2.toFixed(3)}`);
  // Label anchor — flip to right side if marker is past 70% of x-range to avoid clipping
  let label_x = $derived(alpha_deg / alpha_max_deg > 0.7 ? marker_x - 6 : marker_x + 6);
  let label_anchor = $derived(alpha_deg / alpha_max_deg > 0.7 ? 'end' : 'start');

  // y-axis ticks: 1.00, midpoint, max — plus a labelled baseline line at 1.20
  let y_ticks = $derived([f_min, (f_min + f_max) / 2, f_max]);
  const x_majors = [0, 5, 10, 15];
  const x_minors = [2.5, 7.5, 12.5];
</script>

<svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet"
     style="width: 100%; height: auto; background: #fafafa; border: 1px solid var(--border);">
  <!-- Axes -->
  <line x1={P_L} y1={H - P_B} x2={W - P_R} y2={H - P_B} stroke="#333" stroke-width="1" />
  <line x1={P_L} y1={P_T} x2={P_L} y2={H - P_B} stroke="#333" stroke-width="1" />

  <!-- §6.28.3 baseline reference line at factor = 1.20 -->
  {#if BASELINE_FACTOR <= f_max}
    <line x1={P_L} y1={y(BASELINE_FACTOR)} x2={W - P_R} y2={y(BASELINE_FACTOR)}
          stroke="#b85c00" stroke-width="1.1" stroke-dasharray="4,3" opacity="0.7" />
    <text x={W - P_R - 4} y={y(BASELINE_FACTOR) - 4} font-size="10" text-anchor="end"
          fill="#b85c00" font-family="Georgia, serif" font-style="italic">
      §6.28.3 baseline = 1.20
    </text>
  {/if}

  <!-- x-ticks -->
  {#each x_majors as tick}
    <line x1={x(tick)} y1={H - P_B} x2={x(tick)} y2={H - P_B + 5} stroke="#333" />
    <text x={x(tick)} y={H - P_B + 15} font-size="10" text-anchor="middle"
          font-family="ui-monospace, monospace">{tick}°</text>
  {/each}
  {#each x_minors as tick}
    <line x1={x(tick)} y1={H - P_B} x2={x(tick)} y2={H - P_B + 3} stroke="#666" />
  {/each}

  <!-- y-ticks (factor) -->
  {#each y_ticks as f}
    <line x1={P_L - 4} y1={y(f)} x2={P_L} y2={y(f)} stroke="#333" />
    <text x={P_L - 7} y={y(f) + 3} font-size="10" text-anchor="end"
          font-family="ui-monospace, monospace">×{f.toFixed(2)}</text>
  {/each}

  <!-- Curves -->
  <path d={path1} stroke="#c0392b" stroke-width="1.8" fill="none" />
  <path d={path2} stroke="#2980b9" stroke-width="1.8" fill="none" />

  <!-- Live α marker: vertical dashed guide + dots on each curve + factor readout -->
  {#if marker_in_range}
    <line x1={marker_x} y1={P_T} x2={marker_x} y2={H - P_B}
          stroke="#b8860b" stroke-width="1" stroke-dasharray="3,3" opacity="0.6" />
    <circle cx={marker_x} cy={marker_y1} r="4" fill="#c0392b" stroke="#fff" stroke-width="1.2" />
    <circle cx={marker_x} cy={marker_y2} r="4" fill="#2980b9" stroke="#fff" stroke-width="1.2" />
    <text x={label_x} y={Math.min(marker_y1, marker_y2) - 8}
          text-anchor={label_anchor} font-size="10"
          font-family="ui-monospace, monospace" fill="#444">
      {marker_label}
    </text>
  {/if}

  <!-- Legend -->
  <g font-size="10" font-family="Georgia, serif" font-style="italic">
    <line x1={P_L + 8} y1={P_T + 6} x2={P_L + 24} y2={P_T + 6} stroke="#c0392b" stroke-width="1.8" />
    <text x={P_L + 28} y={P_T + 9} fill="#c0392b">F₁ / F₁,static</text>
    <line x1={P_L + 8} y1={P_T + 20} x2={P_L + 24} y2={P_T + 20} stroke="#2980b9" stroke-width="1.8" />
    <text x={P_L + 28} y={P_T + 23} fill="#2980b9">F₂ / F₂,static</text>
  </g>

  <!-- Axis labels -->
  <text x={(P_L + W - P_R) / 2} y={H - 8} text-anchor="middle" font-size="10"
        font-family="Georgia, serif" font-style="italic">α (degrees)</text>
  <text x={14} y={(P_T + H - P_B) / 2} text-anchor="middle" font-size="10"
        font-family="Georgia, serif" font-style="italic"
        transform="rotate(-90 14 {(P_T + H - P_B) / 2})">factor (× static)</text>
</svg>
