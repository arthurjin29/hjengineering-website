<!-- web/src/lib/components/ChartFvTheta.svelte -->
<script lang="ts">
  import { computeTailingGeneral } from '$lib/dual-lift-calc/mode2';

  let {
    M_kg, dx_m, dy_m, dxt_m, dyt_m, theta_deg = null
  }: {
    M_kg: number;
    dx_m: number; dy_m: number;     // head → COG in load-local
    dxt_m: number; dyt_m: number;   // head → tail lug in load-local
    theta_deg?: number | null;       // optional: vertical marker at user's current θ
  } = $props();

  const W = 480, H = 220, P_L = 56, P_R = 22, P_T = 22, P_B = 38;
  const KEY_ANGLES = [0, 76, 90];

  let curve = $derived.by(() => {
    const pts: Array<{ t: number; h: number; tl: number }> = [];
    for (let i = 0; i <= 90; i++) {
      const r = computeTailingGeneral({ M_kg, dx_m, dy_m, dxt_m, dyt_m, theta_deg: i });
      // Clamp negative F values (past-natural-hang) to 0 for plotting only
      pts.push({ t: i, h: Math.max(r.F_head_kg, 0), tl: Math.max(r.F_tail_kg, 0) });
    }
    return pts;
  });

  let markers = $derived(KEY_ANGLES.map(t => {
    const r = computeTailingGeneral({ M_kg, dx_m, dy_m, dxt_m, dyt_m, theta_deg: t });
    return { t, h: Math.max(r.F_head_kg, 0), tl: Math.max(r.F_tail_kg, 0) };
  }));

  // Live marker at the user's slider θ
  let live_marker = $derived.by(() => {
    if (theta_deg == null) return null;
    const r = computeTailingGeneral({ M_kg, dx_m, dy_m, dxt_m, dyt_m, theta_deg });
    return { t: theta_deg, h: Math.max(r.F_head_kg, 0), tl: Math.max(r.F_tail_kg, 0) };
  });

  function x(t: number): number { return P_L + (t / 90) * (W - P_L - P_R); }
  function y(f: number): number { return H - P_B - (f / M_kg) * (H - P_T - P_B); }

  let path_h = $derived(curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t)} ${y(p.h)}`).join(' '));
  let path_tl = $derived(curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t)} ${y(p.tl)}`).join(' '));

  let y_ticks = $derived([0, M_kg / 2, M_kg]);
</script>

<svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet"
     style="width: 100%; height: auto; background: #fafafa; border: 1px solid var(--border);">
  <!-- Axes -->
  <line x1={P_L} y1={H - P_B} x2={W - P_R} y2={H - P_B} stroke="#333" stroke-width="1" />
  <line x1={P_L} y1={P_T} x2={P_L} y2={H - P_B} stroke="#333" stroke-width="1" />

  <!-- Vertical gridlines at the 5 key angles -->
  {#each KEY_ANGLES as t}
    <line x1={x(t)} y1={P_T} x2={x(t)} y2={H - P_B}
          stroke="#dcdde1" stroke-width="0.6" stroke-dasharray="2,3" />
  {/each}

  <!-- x-axis tick labels at key angles -->
  {#each KEY_ANGLES as tick}
    <line x1={x(tick)} y1={H - P_B} x2={x(tick)} y2={H - P_B + 5} stroke="#333" />
    <text x={x(tick)} y={H - P_B + 15} font-size="10" text-anchor="middle"
          font-family="ui-monospace, monospace">{tick}°</text>
  {/each}

  <!-- y-ticks (tonnes) -->
  {#each y_ticks as f}
    <line x1={P_L - 4} y1={y(f)} x2={P_L} y2={y(f)} stroke="#333" />
    <text x={P_L - 7} y={y(f) + 3} font-size="10" text-anchor="end"
          font-family="ui-monospace, monospace">{(f / 1000).toFixed(1)}t</text>
  {/each}

  <!-- Curves -->
  <path d={path_h} stroke="#c0392b" stroke-width="1.8" fill="none" />
  <path d={path_tl} stroke="#2980b9" stroke-width="1.8" fill="none" />

  <!-- Live marker at user's slider θ — vertical line + filled dots on both curves -->
  {#if live_marker}
    <line x1={x(live_marker.t)} y1={P_T} x2={x(live_marker.t)} y2={H - P_B}
          stroke="#7d6608" stroke-width="1.4" stroke-dasharray="5,3" />
    <circle cx={x(live_marker.t)} cy={y(live_marker.h)} r="4.5" fill="#7d6608" stroke="white" stroke-width="1.2" />
    <circle cx={x(live_marker.t)} cy={y(live_marker.tl)} r="4.5" fill="#7d6608" stroke="white" stroke-width="1.2" />
    <text x={x(live_marker.t) + 6} y={P_T + 12} font-size="10" fill="#7d6608"
          font-family="ui-monospace, monospace" font-weight="700">θ={live_marker.t.toFixed(0)}°</text>
  {/if}

  <!-- 3 key-angle markers — filled dots on each curve + small labels -->
  {#each markers as m}
    <circle cx={x(m.t)} cy={y(m.h)} r="3.5" fill="#c0392b" stroke="white" stroke-width="1" />
    <circle cx={x(m.t)} cy={y(m.tl)} r="3.5" fill="#2980b9" stroke="white" stroke-width="1" />
    <text x={x(m.t)} y={y(m.h) - 7} font-size="9" text-anchor="middle"
          font-family="ui-monospace, monospace" fill="#c0392b">{(m.h / 1000).toFixed(1)}</text>
    <text x={x(m.t)} y={y(m.tl) + 13} font-size="9" text-anchor="middle"
          font-family="ui-monospace, monospace" fill="#2980b9">{(m.tl / 1000).toFixed(1)}</text>
  {/each}

  <!-- Legend — top-right -->
  <g font-size="10" font-family="Georgia, serif" font-style="italic">
    <line x1={W - P_R - 78} y1={P_T + 6} x2={W - P_R - 62} y2={P_T + 6} stroke="#c0392b" stroke-width="1.8" />
    <circle cx={W - P_R - 70} cy={P_T + 6} r="3" fill="#c0392b" stroke="white" stroke-width="1" />
    <text x={W - P_R - 58} y={P_T + 9} fill="#c0392b">F head</text>
    <line x1={W - P_R - 78} y1={P_T + 20} x2={W - P_R - 62} y2={P_T + 20} stroke="#2980b9" stroke-width="1.8" />
    <circle cx={W - P_R - 70} cy={P_T + 20} r="3" fill="#2980b9" stroke="white" stroke-width="1" />
    <text x={W - P_R - 58} y={P_T + 23} fill="#2980b9">F tail</text>
  </g>

  <!-- Axis labels -->
  <text x={(P_L + W - P_R) / 2} y={H - 8} text-anchor="middle" font-size="10"
        font-family="Georgia, serif" font-style="italic">θ (degrees)</text>
  <text x={14} y={(P_T + H - P_B) / 2} text-anchor="middle" font-size="10"
        font-family="Georgia, serif" font-style="italic"
        transform="rotate(-90 14 {(P_T + H - P_B) / 2})">F (tonnes)</text>
</svg>
