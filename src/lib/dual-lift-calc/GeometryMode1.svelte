<!-- web/src/lib/components/GeometryMode1.svelte -->
<script lang="ts">
  let {
    L_m, H_m, x_cog, y_cog,
    x_lp1, y_lp1, x_lp2, y_lp2,
    x_s1,  y_s1,  x_s2,  y_s2,
    alpha_deg
  }: {
    L_m: number; H_m: number;
    x_cog: number; y_cog: number;
    x_lp1: number; y_lp1: number; x_lp2: number; y_lp2: number;
    x_s1: number;  y_s1: number;  x_s2: number;  y_s2: number;
    alpha_deg: number;
  } = $props();

  // Viewport
  const SVG_W = 900;
  const SVG_H = 380;
  const PAD = 26;
  const HOOK_HEADROOM_PX = 60;
  const SUPPORT_BAND_PX = 28;

  // Data extent (metres)
  let x_min = $derived(Math.min(0, x_s1, x_s2, x_lp1, x_lp2) - 0.5);
  let x_max = $derived(Math.max(L_m, x_s1, x_s2, x_lp1, x_lp2) + 0.5);
  let data_w_m = $derived(x_max - x_min);
  let data_h_m = $derived(Math.max(H_m, 0.5));

  // Uniform scale (px per metre)
  let usable_w_px = SVG_W - 2 * PAD;
  let usable_h_px = SVG_H - 2 * PAD - HOOK_HEADROOM_PX - SUPPORT_BAND_PX;
  let scale = $derived(Math.min(usable_w_px / data_w_m, usable_h_px / data_h_m));

  let offset_x_px = $derived(PAD + (usable_w_px - data_w_m * scale) / 2);
  let load_top_px = PAD + HOOK_HEADROOM_PX;
  let load_bottom_px = $derived(load_top_px + data_h_m * scale);

  function px_x(x_m: number): number { return offset_x_px + (x_m - x_min) * scale; }
  function px_y(y_m: number): number { return load_top_px + (H_m - y_m) * scale; }

  let load_left = $derived(px_x(0));
  let load_right = $derived(px_x(L_m));

  let lp1 = $derived({ x: px_x(x_lp1), y: px_y(y_lp1) });
  let lp2 = $derived({ x: px_x(x_lp2), y: px_y(y_lp2) });
  let cog = $derived({ x: px_x(x_cog), y: px_y(y_cog) });
  let s1 = $derived({ x: px_x(x_s1), y: px_y(y_s1) });
  let s2 = $derived({ x: px_x(x_s2), y: px_y(y_s2) });

  // In-plane tilt about lift-line midpoint
  let dy = $derived(((Math.abs(x_lp2 - x_lp1) * scale) * Math.sin(alpha_deg * Math.PI / 180)) / 2);

  let bar_metres = $derived(data_w_m > 10 ? 5 : 1);
  let bar_px = $derived(bar_metres * scale);

  let dim_y_L = $derived(load_bottom_px + SUPPORT_BAND_PX + 4);
  let dim_x_H = $derived(load_right + 16);
</script>

<svg viewBox="0 0 {SVG_W} {SVG_H}" preserveAspectRatio="xMidYMid meet"
     style="width: 100%; height: auto; background: #fafafa; border: 1px solid var(--border);">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#c0392b" />
    </marker>
    <marker id="arrow-dim-l" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M7,1 L1,4 L7,7" fill="none" stroke="#666" stroke-width="0.8" />
    </marker>
    <marker id="arrow-dim-r" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M1,1 L7,4 L1,7" fill="none" stroke="#666" stroke-width="0.8" />
    </marker>
    <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
      <path d="M {scale} 0 L 0 0 0 {scale}" fill="none" stroke="#ecf0f1" stroke-width="0.6" />
    </pattern>
  </defs>

  <rect x={PAD} y={PAD} width={SVG_W - 2*PAD} height={SVG_H - 2*PAD} fill="url(#grid)" />

  <rect x={load_left} y={load_top_px} width={load_right - load_left} height={load_bottom_px - load_top_px}
        fill="#fff8e1" stroke="#1a1a1a" stroke-width="1.6" />

  <!-- L dimension line (below the support band) -->
  <line x1={load_left} y1={load_bottom_px + 12} x2={load_left} y2={dim_y_L + 4}
        stroke="#666" stroke-width="0.6" />
  <line x1={load_right} y1={load_bottom_px + 12} x2={load_right} y2={dim_y_L + 4}
        stroke="#666" stroke-width="0.6" />
  <line x1={load_left} y1={dim_y_L} x2={load_right} y2={dim_y_L}
        stroke="#666" stroke-width="0.8" marker-start="url(#arrow-dim-l)" marker-end="url(#arrow-dim-r)" />
  <rect x={(load_left + load_right) / 2 - 38} y={dim_y_L - 6} width="76" height="12"
        fill="#fafafa" stroke="none" />
  <text x={(load_left + load_right) / 2} y={dim_y_L + 3}
        text-anchor="middle" font-size="11" fill="#333"
        font-family="Georgia, serif" font-style="italic">
    L = {L_m.toFixed(2)} m
  </text>

  <!-- H dimension line (right of the load) -->
  <line x1={load_right + 4} y1={load_top_px} x2={dim_x_H + 4} y2={load_top_px}
        stroke="#666" stroke-width="0.6" />
  <line x1={load_right + 4} y1={load_bottom_px} x2={dim_x_H + 4} y2={load_bottom_px}
        stroke="#666" stroke-width="0.6" />
  <line x1={dim_x_H} y1={load_top_px} x2={dim_x_H} y2={load_bottom_px}
        stroke="#666" stroke-width="0.8" marker-start="url(#arrow-dim-l)" marker-end="url(#arrow-dim-r)" />
  <text x={dim_x_H + 6} y={(load_top_px + load_bottom_px) / 2}
        font-size="11" fill="#333" dominant-baseline="middle"
        font-family="Georgia, serif" font-style="italic">
    H = {H_m.toFixed(2)} m
  </text>

  <!-- Crane hooks: arrows from lift points up to top of viewport -->
  <line x1={lp1.x} y1={lp1.y - dy} x2={lp1.x} y2={PAD - 4}
        stroke="#c0392b" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1={lp2.x} y1={lp2.y + dy} x2={lp2.x} y2={PAD - 4}
        stroke="#c0392b" stroke-width="1.8" marker-end="url(#arrow)" />

  {#if alpha_deg > 0.01}
    <line x1={lp1.x} y1={lp1.y - dy} x2={lp2.x} y2={lp2.y + dy}
          stroke="#c0392b" stroke-width="1" stroke-dasharray="3,3" />
  {/if}

  <!-- Lift point markers -->
  <circle cx={lp1.x} cy={lp1.y} r="4" fill="#c0392b" />
  <circle cx={lp2.x} cy={lp2.y} r="4" fill="#c0392b" />
  <text x={lp1.x} y={lp1.y - 10} text-anchor="middle" font-size="11" fill="#c0392b"
        font-family="Georgia, serif" font-style="italic">LP₁ ({x_lp1.toFixed(1)}, {y_lp1.toFixed(1)})</text>
  <text x={lp2.x} y={lp2.y - 10} text-anchor="middle" font-size="11" fill="#c0392b"
        font-family="Georgia, serif" font-style="italic">LP₂ ({x_lp2.toFixed(1)}, {y_lp2.toFixed(1)})</text>

  <!-- COG marker -->
  <circle cx={cog.x} cy={cog.y} r="7" fill="white" stroke="black" stroke-width="1.2" />
  <path d="M {cog.x - 7} {cog.y} A 7 7 0 0 1 {cog.x} {cog.y - 7} L {cog.x} {cog.y} Z" fill="black" />
  <path d="M {cog.x + 7} {cog.y} A 7 7 0 0 1 {cog.x} {cog.y + 7} L {cog.x} {cog.y} Z" fill="black" />
  <text x={cog.x + 11} y={cog.y + 4} font-size="11" font-family="Georgia, serif" font-style="italic">COG</text>

  <!-- Landing supports — drawn at their actual y position -->
  <rect x={s1.x - 14} y={s1.y} width="28" height="10" fill="#5b8bb1" stroke="#1a4d7d" stroke-width="1.2" />
  <rect x={s2.x - 14} y={s2.y} width="28" height="10" fill="#5b8bb1" stroke="#1a4d7d" stroke-width="1.2" />
  <text x={s1.x} y={s1.y + 22} text-anchor="middle" font-size="11" fill="#1a4d7d"
        font-family="Georgia, serif" font-style="italic">S₁ ({x_s1.toFixed(1)}, {y_s1.toFixed(1)})</text>
  <text x={s2.x} y={s2.y + 22} text-anchor="middle" font-size="11" fill="#1a4d7d"
        font-family="Georgia, serif" font-style="italic">S₂ ({x_s2.toFixed(1)}, {y_s2.toFixed(1)})</text>

  <!-- Scale bar -->
  <g transform="translate({SVG_W - PAD - bar_px}, {SVG_H - 14})">
    <line x1="0" y1="0" x2={bar_px} y2="0" stroke="black" stroke-width="1.5" />
    <line x1="0" y1="-4" x2="0" y2="4" stroke="black" stroke-width="1.5" />
    <line x1={bar_px} y1="-4" x2={bar_px} y2="4" stroke="black" stroke-width="1.5" />
    <text x={bar_px / 2} y="-7" text-anchor="middle" font-size="10" fill="#333"
          font-family="ui-monospace, monospace">{bar_metres} m</text>
  </g>
</svg>
