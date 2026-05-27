<!-- web/src/lib/components/GeometryMode2.svelte -->
<script lang="ts">
  let {
    L_m, H_m, x_cog, y_cog,
    x_lp1, y_lp1, x_lp2, y_lp2,
    Y1_m, theta_deg
  }: {
    L_m: number; H_m: number;
    x_cog: number; y_cog: number;
    x_lp1: number; y_lp1: number;
    x_lp2: number; y_lp2: number;
    Y1_m: number; theta_deg: number;
  } = $props();

  // Viewport — taller aspect ratio gives each diagram more vertical room,
  // important for θ=90° (load vertical, extends down by L). Bottom band kept
  // tight so the load fills more of the available height.
  const SVG_W = 900;
  const SVG_H = 480;
  const PAD = 26;
  const HEADROOM_PX = 54;
  const GROUND_BAND_PX = 16;

  // The load rotates from horizontal (θ=0) to vertical (θ=90°) about the head pick.
  // Scale must accommodate L + Y1 horizontally (θ=0 case w/ tail lug above tail)
  // and L + H vertically (θ=90° case w/ load extending down from head pick).
  let usable_w_px = SVG_W - 2 * PAD;
  let usable_h_px = SVG_H - 2 * PAD - HEADROOM_PX - GROUND_BAND_PX;
  let need_w_m = $derived(L_m + Y1_m + H_m + 0.5);
  let need_h_m = $derived(L_m + H_m + 0.5);
  let scale = $derived(Math.min(usable_w_px / need_w_m, usable_h_px / need_h_m));

  let t = $derived(theta_deg * Math.PI / 180);

  // Two-pass coordinate computation:
  //   Pass 1 — compute load corners + lug position relative to head_pivot at origin
  //   Pass 2 — compute bbox of those positions, then shift so bbox is centered
  //            horizontally in the viewBox (vertical pinned to leave headroom
  //            for the head crane rope going up to PAD-4).

  // Pass 1: positions relative to head_pivot at (0, 0), in pixel units
  function lc_relative(px: number, py: number): [number, number] {
    const dx = px - x_lp1;
    const dy = py - y_lp1;
    const c = Math.cos(t), s = Math.sin(t);
    return [scale * (dx * c + dy * s), scale * (dx * s - dy * c)];
  }
  let rel_corners = $derived([
    lc_relative(0, 0), lc_relative(L_m, 0), lc_relative(L_m, H_m), lc_relative(0, H_m)
  ]);
  let rel_lug = $derived(lc_relative(x_lp2, y_lp2 + Y1_m));
  let rel_all = $derived([...rel_corners, rel_lug, [0, 0] as [number, number]]);  // include head pivot (0,0)

  let bbox_min_x = $derived(Math.min(...rel_all.map(p => p[0])));
  let bbox_max_x = $derived(Math.max(...rel_all.map(p => p[0])));
  let bbox_min_y = $derived(Math.min(...rel_all.map(p => p[1])));
  let bbox_max_y = $derived(Math.max(...rel_all.map(p => p[1])));
  let bbox_center_x = $derived((bbox_min_x + bbox_max_x) / 2);

  // Head crane pivot — shifted so the load+lug bbox is centred horizontally.
  // Vertically pinned to leave headroom for the rope (always above bbox top).
  let head_pivot_x = $derived(SVG_W / 2 - bbox_center_x);
  let head_pivot_y = $derived(PAD + HEADROOM_PX - bbox_min_y);

  // Pass 2: final pixel coordinates by adding the shifted pivot
  function loadToWorld(px: number, py: number): [number, number] {
    const [rx, ry] = lc_relative(px, py);
    return [head_pivot_x + rx, head_pivot_y + ry];
  }

  // Rectangle corners + key points
  let [c1x, c1y] = $derived.by(() => loadToWorld(0, 0));
  let [c2x, c2y] = $derived.by(() => loadToWorld(L_m, 0));
  let [c3x, c3y] = $derived.by(() => loadToWorld(L_m, H_m));
  let [c4x, c4y] = $derived.by(() => loadToWorld(0, H_m));
  let rect_points = $derived(`${c1x},${c1y} ${c2x},${c2y} ${c3x},${c3y} ${c4x},${c4y}`);
  let [head_px, head_py] = $derived.by(() => loadToWorld(x_lp1, y_lp1));
  let [tail_px, tail_py] = $derived.by(() => loadToWorld(x_lp2, y_lp2));
  let [cog_px, cog_py]   = $derived.by(() => loadToWorld(x_cog, y_cog));
  let [lug_px, lug_py]   = $derived.by(() => loadToWorld(x_lp2, y_lp2 + Y1_m));

  let bar_metres = $derived(need_w_m > 10 ? 5 : 1);
  let bar_px = $derived(bar_metres * scale);
</script>

<svg viewBox="0 0 {SVG_W} {SVG_H}" preserveAspectRatio="xMidYMid meet"
     style="width: 100%; height: auto; background: #fafafa; border: 1px solid var(--border);">
  <defs>
    <pattern id="grid2" width={scale} height={scale} patternUnits="userSpaceOnUse">
      <path d="M {scale} 0 L 0 0 0 {scale}" fill="none" stroke="#ecf0f1" stroke-width="0.6" />
    </pattern>
  </defs>

  <!-- Light 1 m grid -->
  <rect x={PAD} y={PAD} width={SVG_W - 2*PAD} height={SVG_H - 2*PAD} fill="url(#grid2)" />

  <!-- Ground reference line -->
  <line x1={PAD} y1={SVG_H - GROUND_BAND_PX} x2={SVG_W - PAD} y2={SVG_H - GROUND_BAND_PX}
        stroke="#888" stroke-dasharray="6,4" stroke-width="1.2" />

  <!-- Load body — rectangle from the side, rotates about head pick -->
  <polygon points={rect_points} fill="#fff8e1" stroke="#1a1a1a" stroke-width="1.6" />

  <!-- Tail lug — only shown when Y1 > 0 (otherwise lug overlaps the tail pick) -->
  {#if Y1_m > 1e-6}
    <line x1={tail_px} y1={tail_py} x2={lug_px} y2={lug_py}
          stroke="#1a4d7d" stroke-width="2.2" stroke-dasharray="4,3" />
    <circle cx={lug_px} cy={lug_py} r="5" fill="#1a4d7d" />
    <text x={lug_px + 10} y={lug_py + 5} font-size="15" fill="#1a4d7d"
          font-family="Georgia, serif" font-style="italic">tail lug (Y₁)</text>
  {/if}

  <!-- COG marker (crosshair) -->
  <circle cx={cog_px} cy={cog_py} r="9" fill="white" stroke="black" stroke-width="1.4" />
  <path d="M {cog_px - 9} {cog_py} A 9 9 0 0 1 {cog_px} {cog_py - 9} L {cog_px} {cog_py} Z" fill="black" />
  <path d="M {cog_px + 9} {cog_py} A 9 9 0 0 1 {cog_px} {cog_py + 9} L {cog_px} {cog_py} Z" fill="black" />
  <text x={cog_px + 14} y={cog_py + 5} font-size="15" font-family="Georgia, serif" font-style="italic">COG</text>

  <!-- Head crane rope (vertical, fixed in world frame) -->
  <line x1={head_px} y1={head_py} x2={head_px} y2={PAD - 4}
        stroke="#c0392b" stroke-width="2" stroke-dasharray="3,3" />
  <circle cx={head_px} cy={head_py} r="7" fill="#c0392b" />
  <text x={head_px - 10} y={head_py - 14} text-anchor="end" font-size="15" fill="#c0392b"
        font-family="Georgia, serif" font-style="italic">head crane (fixed)</text>

  <!-- Tail crane rope (vertical from tail lug up to top) -->
  <line x1={lug_px} y1={lug_py} x2={lug_px} y2={PAD - 4}
        stroke="#1a4d7d" stroke-width="2" stroke-dasharray="3,3" />
  <circle cx={tail_px} cy={tail_py} r="6" fill="#1a4d7d" />
  <text x={tail_px + 12} y={tail_py + 5} font-size="15" fill="#1a4d7d"
        font-family="Georgia, serif" font-style="italic">tail pick</text>

  <!-- θ label (top left) -->
  <text x={PAD + 6} y={PAD + 18} font-size="19" font-weight="700"
        font-family="Georgia, serif" font-style="italic">
    θ = {theta_deg.toFixed(0)}°
  </text>

  <!-- Scale bar (bottom right) -->
  <g transform="translate({SVG_W - PAD - bar_px}, {SVG_H - 6})">
    <line x1="0" y1="0" x2={bar_px} y2="0" stroke="black" stroke-width="1.5" />
    <line x1="0" y1="-5" x2="0" y2="5" stroke="black" stroke-width="1.5" />
    <line x1={bar_px} y1="-5" x2={bar_px} y2="5" stroke="black" stroke-width="1.5" />
    <text x={bar_px / 2} y="-9" text-anchor="middle" font-size="13" fill="#333"
          font-family="ui-monospace, monospace">{bar_metres} m</text>
  </g>
</svg>
