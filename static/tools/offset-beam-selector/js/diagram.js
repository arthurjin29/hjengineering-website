// Lug display label — self-contained mirror of selector.lugLabel (diagram.js stays dependency-free
// so its node test needs no selector import). Chart-lettered lugs (OLB-1 = A/B, OLB-14 = A/B/C)
// show their letter; everything else shows the numeric id.
function lugTag(beam, lugId) {
  const l = beam.offset_lugs.find(x => x.id === Number(lugId));
  return (l && l.chart_lug_label) || String(lugId);
}

// Side-elevation SVG of the offset lifting beam as a two-leg suspension, to true scale (mm).
// The beam tilts to equilibrium; front (top) sling + rear leg (chain block) drawn from the hook.
// view = { lugId, holeIndex, holeXMm, hole, loadKg, ok, su, chainBlockMm }
function renderDiagram(beam, view) {
  if (beam.maker === 'Maxirig') return renderMaxirigDiagram(beam, view);
  const su = view.su;
  const depth = beam.beam_depth_mm || 700;
  const blockW = (beam.ballast_block_mm && beam.ballast_block_mm.width) || 1000;
  const blockH = (beam.ballast_block_mm && beam.ballast_block_mm.height) || 700;
  const xL = su.xL, beta = su.beta;
  const cosB = Math.cos(beta), sinB = Math.sin(beta);
  const ptW = bx => ({ x: su.lugA.x + (bx - xL) * cosB, y: su.lugA.y + (bx - xL) * sinB });

  const hookW = su.hook, loadPtW = ptW(0), rearW = ptW(beam.back_lug_x_mm), holeW = ptW(view.holeXMm);
  const loadDrop = 2200, loadH = 1500, pin = 200;

  // counterweight is bolted below the beam and tilts with it (along the beam normal, away from hook)
  const bn = { x: Math.sin(beta), y: -Math.cos(beta) };
  const blockBot = { x: holeW.x + (depth + blockH) * bn.x, y: holeW.y + (depth + blockH) * bn.y };
  // world bbox (y UP)
  const loadArrowBotY = loadPtW.y - 1500;   // load-arrow tip (tail 300 below the lug + 1200 mm shaft)
  const xs = [hookW.x, loadPtW.x, rearW.x, holeW.x, su.lugA.x, blockBot.x];
  const ys = [hookW.y, loadPtW.y, rearW.y, su.lugA.y, loadArrowBotY, blockBot.y];
  let minX = Math.min(...xs) - 2400, maxX = Math.max(...xs) + 900;
  // Top margin sized in SCREEN px (converted to world via the width-derived scale) so the beam/sling
  // sit a consistent distance below the fixed header text, whatever the beam's length/scale.
  const topGapPx = 120, sX = 940 / (maxX - minX);
  let minY = Math.min(...ys) - 800, maxY = Math.max(...ys) + topGapPx / sX;
  if (view.frame) ({ minX, maxX, minY, maxY } = view.frame);   // frozen frame: drag/sliders must not reframe
  const wW = maxX - minX, wH = maxY - minY;
  const targetW = 940, scale = targetW / wW, svgW = targetW, svgH = wH * scale;
  const SX = wx => ((wx - minX) * scale).toFixed(1);
  const SY = wy => ((maxY - wy) * scale).toFixed(1);     // flip y-up -> screen y-down
  const Spx = mm => (mm * scale).toFixed(1);
  const accent = view.ok ? '#0a7d2c' : '#c0392b';
  const fr = beam.rigging.front_sling_deg, rr = beam.rigging.rear_sling_deg;
  // Detached = load set down: the beam hangs empty and swings to its own equilibrium, so the rig
  // angle window no longer governs — legs are NOT flagged for being outside it (only a
  // geometrically impossible leg, !su.valid, stays red).
  const angleGoverns = !view.detached;
  const frontBad = angleGoverns && (su.frontAngleDeg < (fr.min - 0.5) || su.frontAngleDeg > (fr.max + 0.5));
  const rearBad = angleGoverns && (!rr || su.rearAngleDeg < (rr.min - 0.5) || su.rearAngleDeg > (rr.max + 0.5));
  const frontColor = (frontBad || !su.valid) ? '#c0392b' : '#1f6feb';
  const rearColor = (rearBad || !su.valid) ? '#c0392b' : '#0a7d2c';
  const capLen = (beam.rigging && beam.rigging.max_sling_len_mm) || 0;
  const overCap = '<tspan fill="#d98c00" font-weight="700"> &#9888;</tspan>';   // soft-cap warning glyph
  const frontOver = capLen && su.valid && su.T > capLen + 1;
  const chainOver = capLen && (view.topChainMm || 0) > capLen + 1;

  const L = [];
  L.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW.toFixed(0)} ${svgH.toFixed(0)}" ` +
    `data-ox="${(-minX * scale).toFixed(3)}" data-scale="${scale.toFixed(6)}" ` +
    `data-minx="${minX.toFixed(3)}" data-maxx="${maxX.toFixed(3)}" data-miny="${minY.toFixed(3)}" data-maxy="${maxY.toFixed(3)}" ` +
    `font-family="system-ui, sans-serif" font-size="22">`);
  // beam info — fixed top-left corner so it never covers the model
  L.push(`<text x="8" y="20" font-size="19" fill="#c0392b" font-weight="700">${beam.id} · WLL ${beam.wll_t} T · Beam ${beam.self_weight_kg} kg · C/W ${beam.ballast_kg} kg</text>`);

  // cleat geometry + sling attach points (slings reach the cleat holes, above the beam top).
  // GTC standard lifting lug — a REAL cleat confirmed on OLB-1: 200 mm gusset base, Ø40 hole 75 mm
  // above the beam top, R45 crown. Drawn at true mm x scale so the lug stays proportional to each
  // drawing instead of ballooning with beam depth (the old depth/150 basis over-sized deep beams).
  const clBase = 200, cleatHoleH = 75, lugHoleR = 20, lugCrownR = 45;
  const toHook = { x: -Math.sin(beta), y: Math.cos(beta) };          // beam normal toward the hook
  const cleatHoleA = { x: su.lugA.x + cleatHoleH * toHook.x, y: su.lugA.y + cleatHoleH * toHook.y };
  const cleatHoleB = { x: rearW.x + cleatHoleH * toHook.x, y: rearW.y + cleatHoleH * toHook.y };

  // ---- slings (world coords), to the cleat holes ----
  L.push(`<line data-role="leg-line" data-leg="front" x1="${SX(hookW.x)}" y1="${SY(hookW.y)}" x2="${SX(cleatHoleA.x)}" y2="${SY(cleatHoleA.y)}" stroke="${frontColor}" stroke-width="3"/>`);
  L.push(`<line data-role="leg-line" data-leg="rear" x1="${SX(hookW.x)}" y1="${SY(hookW.y)}" x2="${SX(cleatHoleB.x)}" y2="${SY(cleatHoleB.y)}" stroke="${rearColor}" stroke-width="3"/>`);
  // leg labels pushed to the OUTSIDE of the suspension triangle, perpendicular to each leg (>=18 px);
  // tension sub-label one line-height below, on the same outward side.
  const hkS = { x: Number(SX(hookW.x)), y: Number(SY(hookW.y)) };
  const fLS = { x: Number(SX(cleatHoleA.x)), y: Number(SY(cleatHoleA.y)) };   // front lug (left)
  const rLS = { x: Number(SX(cleatHoleB.x)), y: Number(SY(cleatHoleB.y)) };   // rear lug (right)
  const LBLOFF = 20, LBLH = 19;
  const outNormal = (Ax, Ay, Bx, By, Cx, Cy) => {   // unit normal to A->B pointing away from inside pt C
    let nx = -(By - Ay), ny = (Bx - Ax); const mag = Math.hypot(nx, ny) || 1; nx /= mag; ny /= mag;
    const mx = (Ax + Bx) / 2, my = (Ay + By) / 2;
    if (nx * (mx - Cx) + ny * (my - Cy) < 0) { nx = -nx; ny = -ny; }
    return { nx, ny };
  };
  const TN = view.tension;
  {   // front leg (outside = away from the rear lug)
    const mx = (hkS.x + fLS.x) / 2, my = (hkS.y + fLS.y) / 2, n = outNormal(hkS.x, hkS.y, fLS.x, fLS.y, rLS.x, rLS.y);
    const ax = mx + n.nx * LBLOFF, ay = my + n.ny * LBLOFF, anc = n.nx < 0 ? 'end' : 'start';
    L.push(`<text data-role="leg-label" data-leg="front" x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" text-anchor="${anc}" fill="${frontColor}" font-weight="600">Top sling ${(su.T/1000).toFixed(2)} m @ ${su.frontAngleDeg.toFixed(0)}&#176;${frontOver ? overCap : ''}</text>`);
    if (TN && TN.valid) L.push(`<text x="${ax.toFixed(1)}" y="${(ay + LBLH).toFixed(1)}" text-anchor="${anc}" fill="${frontColor}" font-size="19">${TN.slackFront ? 'slack' : 'T ' + TN.frontKN.toFixed(0) + ' kN (' + TN.frontT.toFixed(1) + ' t)'}</text>`);
  }
  {   // rear leg (outside = away from the front lug)
    const mx = (hkS.x + rLS.x) / 2, my = (hkS.y + rLS.y) / 2, n = outNormal(hkS.x, hkS.y, rLS.x, rLS.y, fLS.x, fLS.y);
    const ax = mx + n.nx * LBLOFF, ay = my + n.ny * LBLOFF, anc = n.nx < 0 ? 'end' : 'start';
    L.push(`<text data-role="leg-label" data-leg="rear" x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" text-anchor="${anc}" fill="${rearColor}" font-weight="600">Top chain ${((view.topChainMm||0)/1000).toFixed(2)} m @ ${su.rearAngleDeg.toFixed(0)}&#176;${chainOver ? overCap : ''}</text>`);
    if (TN && TN.valid) L.push(`<text x="${ax.toFixed(1)}" y="${(ay + LBLH).toFixed(1)}" text-anchor="${anc}" fill="${rearColor}" font-size="19">${TN.slackRear ? 'slack' : 'T ' + TN.rearKN.toFixed(0) + ' kN (' + TN.rearT.toFixed(1) + ' t)'}</text>`);
  }
  // chain block = draggable handle that slides up/down the rear leg (adjusts its length)
  const cb = { x: hookW.x + 0.6*(cleatHoleB.x - hookW.x), y: hookW.y + 0.6*(cleatHoleB.y - hookW.y) };
  const legPX = Number(SX(cleatHoleB.x)) - Number(SX(hookW.x));
  const legPY = Number(SY(cleatHoleB.y)) - Number(SY(hookW.y));
  const legLen = Math.hypot(legPX, legPY) || 1;
  L.push(`<g id="chainblk" style="cursor:ns-resize" data-ux="${(legPX/legLen).toFixed(5)}" data-uy="${(legPY/legLen).toFixed(5)}">`);
  L.push(`<title>Drag along the rear leg to adjust the chain block</title>`);
  L.push(`<rect x="${SX(cb.x) - 11}" y="${SY(cb.y) - 15}" width="22" height="30" rx="3" fill="#fff" stroke="#444" stroke-width="1.8"/>`);
  // label offset DOWN-LEFT of the block, into the open wedge below the top-sling label and left of
  // the (descending) rear leg — clear of the block, both leg lines and the sling labels. A thin
  // dashed leader ties it back to the block so it still reads as the block's length.
  const lblX = (Number(SX(cb.x)) - 90).toFixed(1), lblY = (Number(SY(cb.y)) + 50).toFixed(1);
  L.push(`<line x1="${SX(cb.x)}" y1="${(Number(SY(cb.y)) + 15).toFixed(1)}" x2="${lblX}" y2="${(Number(lblY) - 11).toFixed(1)}" stroke="#8b4513" stroke-width="0.8" stroke-dasharray="2 2"/>`);
  L.push(`<text x="${lblX}" y="${lblY}" text-anchor="end" fill="#8b4513" font-weight="600">chain block ${(view.chainBlockMm/1000).toFixed(2)} m</text>`);
  L.push(`</g>`);

  // ---- beam assembly (rotated group: local x along beam, y=0 at beam top, +y down) ----
  const ang = (-beta * 180 / Math.PI).toFixed(3);
  const lx = bx => (bx * scale).toFixed(1);
  L.push(`<g transform="translate(${SX(loadPtW.x)},${SY(loadPtW.y)}) rotate(${ang})">`);
  // shallow box girder (like the drawing)
  L.push(`<rect x="0" y="0" width="${Spx(beam.length_mm)}" height="${Spx(depth)}" fill="#d7dce1" stroke="#5b6670" stroke-width="1"/>`);
  L.push(`<line x1="0" y1="0" x2="${Spx(beam.length_mm)}" y2="0" stroke="#2b3038" stroke-width="3.5"/>`);
  L.push(`<line x1="0" y1="${Spx(depth)}" x2="${Spx(beam.length_mm)}" y2="${Spx(depth)}" stroke="#2b3038" stroke-width="3.5"/>`);
  // GTC standard lifting lug: 200 mm gusset base, sloping up to an R45 crown around the Ø40 hole.
  // The hole/crown stay at the true lug x; only the base flanks are clamped onto the beam so a lug
  // near either end (e.g. OLB-6B rear lug) never overhangs the beam — base is flush with the end at most.
  function cleatLocal(bx, fill) {
    const gl = gtcLugBaseMm(beam, bx);
    const x = bx*scale, hy = cleatHoleH*scale, cr = lugCrownR*scale, hr = lugHoleR*scale;
    const bl = gl.leftMm*scale, br = gl.rightMm*scale;
    const d = `M ${bl.toFixed(1)} 0 L ${(x-cr).toFixed(1)} ${(-hy).toFixed(1)} ` +
      `A ${cr.toFixed(1)} ${cr.toFixed(1)} 0 0 1 ${(x+cr).toFixed(1)} ${(-hy).toFixed(1)} ` +
      `L ${br.toFixed(1)} 0 Z`;
    return `<path d="${d}" fill="${fill}" stroke="#2b3038" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<circle cx="${x.toFixed(1)}" cy="${(-hy).toFixed(1)}" r="${hr.toFixed(1)}" fill="#fff" stroke="#2b3038" stroke-width="1.2"/>`;
  }
  beam.offset_lugs.forEach(l => L.push(cleatLocal(l.x_mm, l.id === Number(view.lugId) ? '#1f6feb' : '#aeb6bd')));
  L.push(cleatLocal(beam.back_lug_x_mm, '#aeb6bd'));
  // ballast hole row A–W (lower flange) with red letters below
  const railY = depth * 0.64;
  // explicit unequal pin positions (ballast.holes_x_mm) take precedence over first_hole + pitch
  const holeX = i => beam.ballast.holes_x_mm ? beam.ballast.holes_x_mm[i] : beam.ballast.first_hole_x_mm + beam.ballast.pitch_mm*i;
  const holeXs = beam.ballast.holes.map((_, i) => holeX(i));
  const firstX = Math.min(...holeXs), lastX = Math.max(...holeXs);
  L.push(`<line x1="${lx(firstX-250)}" y1="${Spx(depth*0.44)}" x2="${lx(lastX+250)}" y2="${Spx(depth*0.44)}" stroke="#5b6670" stroke-width="1"/>`);
  // hole circles now; the letters are drawn LAST (after the counterweight block) so the block can
  // never hide a ballast number — see the letter pass below.
  beam.ballast.holes.forEach((letter, i) => {
    const hx = holeX(i), sel = i === view.holeIndex;
    L.push(`<circle data-role="hole" data-hole-i="${i}" cx="${lx(hx)}" cy="${Spx(railY)}" r="${(15*scale).toFixed(1)}" fill="${sel ? accent : '#8a949e'}" stroke="#2b3038" stroke-width="0.6"/>`);
  });
  // lug numbers above each cleat (small, clear of the lug body)
  beam.offset_lugs.forEach(l => {
    const sel = l.id === Number(view.lugId);
    L.push(`<text x="${lx(l.x_mm)}" y="${(-(cleatHoleH + 28)*scale).toFixed(1)}" text-anchor="middle" font-size="16" fill="${sel ? '#1f6feb' : '#5b6670'}" font-weight="${sel ? '700' : '600'}">${lugTag(beam, l.id)}</text>`);
  });
  // counterweight rigidly bolted below the beam (2 bolts) — tilts with the beam
  const cwx = view.holeXMm * scale, bw = blockW * scale, bh = blockH * scale;
  const selLug = beam.offset_lugs.find(l => l.id === Number(view.lugId));
  const cwtFromLugMm = view.holeXMm - (selLug ? selLug.x_mm : 0);
  const boltTop = depth * 0.45 * scale, blockTop = (depth + 40) * scale;
  L.push(`<g id="cwt" style="cursor:grab">`);
  L.push(`<title>Drag to move ballast (snaps to holes A–W)</title>`);
  L.push(`<line data-role="cw-pin" x1="${cwx.toFixed(1)}" y1="${boltTop.toFixed(1)}" x2="${cwx.toFixed(1)}" y2="${(blockTop + bh * 0.3).toFixed(1)}" stroke="#2b3038" stroke-width="2.5"/>`);
  L.push(`<rect x="${(cwx - bw / 2).toFixed(1)}" y="${blockTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${accent}" stroke="#16331f" stroke-width="1.5"/>`);
  L.push(`<text x="${cwx.toFixed(1)}" y="${(blockTop + bh + 14).toFixed(1)}" text-anchor="middle" fill="#16331f" font-size="17" font-weight="700">${((beam.ballast_kg + (view.wingKg || 0)) / 1000).toFixed(2)} T${view.wingKg ? ' (incl. wings)' : ''} · Hole ${view.hole}</text>`);
  L.push(`<text x="${cwx.toFixed(1)}" y="${(blockTop + bh + 28).toFixed(1)}" text-anchor="middle" fill="#333" font-size="16">${(cwtFromLugMm/1000).toFixed(2)} m from lug ${lugTag(beam, view.lugId)}</text>`);
  L.push(`</g>`);
  // ballast letters LAST (on top of the counterweight block) with a white halo so they stay legible.
  // Dense hole rows (e.g. OLB-14: 48 holes at 100 mm pitch) thin to every Nth label so labels
  // never collide; the first, last and SELECTED hole are always labelled.
  const nHoles = beam.ballast.holes.length;
  const holePitchPx = nHoles > 1 ? Math.abs(holeX(1) - holeX(0)) * scale : 999;
  const lblStep = Math.max(1, Math.ceil(16 / holePitchPx));
  beam.ballast.holes.forEach((letter, i) => {
    const onStep = i % lblStep === 0 && (nHoles - 1 - i) >= lblStep;   // drop a step label crowding the last one
    if (!onStep && i !== nHoles - 1 && i !== view.holeIndex) return;
    L.push(`<text x="${lx(holeX(i))}" y="${Spx(depth + 170)}" text-anchor="middle" font-size="15" fill="#c0392b" paint-order="stroke" stroke="#fff" stroke-width="3" stroke-linejoin="round">${letter}</text>`);
  });
  L.push(`</g>`);

  // ---- swivel hook + load (hanging, or on the ground when detached) ----
  L.push(`<text x="${Math.max(215, Number(SX(loadPtW.x)) - 8)}" y="${SY(loadPtW.y - 300)}" text-anchor="end" font-size="17">Swivel hook + 17T shackle</text>`);
  if (view.detached) {
    // load set down: NO load representation at all (no arrow, no box) — just the ground line + the
    // caption. The beam-swing physics still apply (su computed with zero load).
    const groundY = minY + 500;
    L.push(`<line x1="${SX(minX + 200)}" y1="${SY(groundY)}" x2="${SX(loadPtW.x + 2000)}" y2="${SY(groundY)}" stroke="#9aa" stroke-width="2"/>`);
    L.push(`<text x="${SX(loadPtW.x)}" y="${SY(groundY - 250)}" text-anchor="middle" font-size="19" fill="#c0392b">detached (on ground)</text>`);
  } else {
    // standard engineering load arrow: bold vertical arrow pointing DOWN, tail attached to the load lug
    const aTopY = loadPtW.y, aBotY = aTopY - 1200;                 // 1200 mm long (world mm x scale)
    const ax = SX(loadPtW.x), yTop = SY(aTopY), yBot = SY(aBotY), hLen = 18, hHalf = 9;
    L.push(`<line data-role="load-arrow" x1="${ax}" y1="${yTop}" x2="${ax}" y2="${(Number(yBot) - hLen).toFixed(1)}" stroke="${accent}" stroke-width="4"/>`);
    L.push(`<path data-role="load-arrow" d="M ${ax} ${yBot} L ${(Number(ax) - hHalf).toFixed(1)} ${(Number(yBot) - hLen).toFixed(1)} L ${(Number(ax) + hHalf).toFixed(1)} ${(Number(yBot) - hLen).toFixed(1)} Z" fill="${accent}"/>`);
    // weight centred BELOW the arrow tip (was beside the shaft)
    L.push(`<text data-role="load-kg" x="${ax}" y="${(Number(yBot) + 20).toFixed(1)}" text-anchor="middle" fill="${accent}" font-weight="700" font-size="19">${(view.loadKg||0).toLocaleString()} kg</text>`);
  }

  // ---- crane hook ---- (label centred ABOVE the sling-joint node, one line clear)
  L.push(`<circle cx="${SX(hookW.x)}" cy="${SY(hookW.y)}" r="6" fill="#111"/>`);
  L.push(`<text x="${SX(hookW.x)}" y="${(Number(SY(hookW.y)) - 30).toFixed(1)}" text-anchor="middle" font-weight="600">Crane hook</text>`);

  L.push(`</svg>`);
  return L.join('');
}

// Maxirig side-elevation: fixed two-leg sling (front + rear) to a single hook, beam level (loaded),
// counterweight block at the certified chart position. Reuses simple rect/line/text primitives; the
// GTC renderer above is untouched. view = { g (fixedSlingGeometry), pick, lugId, loadKg, ok, useWing }
function renderMaxirigDiagram(beam, view) {
  if (view.chainBlock) return renderMaxirigChainBlock(beam, view);   // GTC-style suspension, Maxirig artwork
  const g = view.g || {}, pick = view.pick || {};
  const depth = beam.beam_depth_mm || 500, L = beam.length_mm;
  const selLug = beam.offset_lugs.find(l => l.id === Number(view.lugId));
  const xLsel = selLug ? selLug.x_mm : 0, xR = beam.back_lug_x_mm;
  const hookX = g.valid ? g.hookX : xLsel, hookY = g.valid ? g.hookY : 3000;
  const cwX = (pick.holeXMm != null) ? pick.holeXMm : beam.ballast.first_hole_x_mm;
  const blockW = 1000, blockH = 650, loadDrop = 1800, loadH = 1300;
  const cleatH = Math.max(240, depth * 0.9);
  const holeX = i => beam.ballast.holes_x_mm ? beam.ballast.holes_x_mm[i] : beam.ballast.first_hole_x_mm + beam.ballast.pitch_mm * i;

  // ballast bracket engages TWO adjacent holes: the picked hole and its neighbour (i+1, else i-1).
  // Pin lines land on the exact hole x (holes_x_mm honoured); the block centres on their midpoint.
  const pinHoleXs = [];
  let cwCenter = cwX;
  if (pick.holeIndex != null) {
    const pi = pick.holeIndex, nb = (pi + 1 < beam.ballast.holes.length) ? pi + 1 : pi - 1;
    pinHoleXs.push(holeX(pi));
    if (nb >= 0 && nb !== pi) pinHoleXs.push(holeX(nb));
    cwCenter = pinHoleXs.reduce((a, b) => a + b, 0) / pinHoleXs.length;
  } else {
    pinHoleXs.push(cwX);
  }

  // world coords, y UP, beam top at y=0, load lug at x=0
  const loadDiaBB = (beam.load_lug && beam.load_lug.dia_mm) || 40;
  const loadArrowBotY = -depth - loadDiaBB * 1.15 - 1500;   // load-arrow tip below the load-lug eye
  const xs = [0, L, hookX, cwCenter + blockW / 2, cwCenter - blockW / 2];
  const ys = [hookY + cleatH, cleatH, -(depth + blockH), loadArrowBotY];
  const minX = Math.min(...xs) - 900, maxX = Math.max(...xs) + 900;
  // top margin in SCREEN px (via the width-derived scale) so the beam/sling clear the header text
  const topGapPx = 120, sX = 940 / (maxX - minX);
  const minY = Math.min(...ys) - 500, maxY = Math.max(...ys) + topGapPx / sX;
  const wW = maxX - minX, wH = maxY - minY, targetW = 940, scale = targetW / wW;
  const svgW = targetW, svgH = wH * scale;
  const SX = wx => ((wx - minX) * scale).toFixed(1);
  const SY = wy => ((maxY - wy) * scale).toFixed(1);
  const Spx = mm => (mm * scale).toFixed(1);
  const ok = view.ok, accent = ok ? '#0a7d2c' : '#c0392b';
  const frontColor = '#1f6feb', rearColor = '#0a7d2c';

  const L2 = [];
  L2.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW.toFixed(0)} ${svgH.toFixed(0)}" font-family="system-ui, sans-serif" font-size="22">`);
  const wingKg = view.useWing ? ((beam.alt_charts && beam.alt_charts.wing_weights && beam.alt_charts.wing_weights.added_mass_kg) || 0) : 0;
  L2.push(`<text x="8" y="20" font-size="19" fill="#c0392b" font-weight="700">${beam.id} · ${beam.name} · Tare ${((beam.self_weight_kg + wingKg)/1000).toFixed(2)} t (C/W ${((beam.counterweight_kg + wingKg)/1000).toFixed(2)} t)${view.useWing ? ` · WING WEIGHTS +${(wingKg/1000).toFixed(1)} t` : ''}</text>`);

  // lug hole heights (real mm) — slings attach at the padeye holes, proportional to each lug's dia
  const frontDia = (selLug && selLug.dia_mm) || 40;
  const rearDia = beam.back_lug_dia_mm || (beam.offset_lugs[0] && beam.offset_lugs[0].dia_mm) || 40;
  const loadDia = (beam.load_lug && beam.load_lug.dia_mm) || 40;
  const holeH = dia => 1.15 * dia;   // padeye boss-centre height above the beam top line
  const loadLugHoleY = -depth - loadDia * 1.15;

  // ---- slings to the single hook (attach at the front-lug and rear-lug padeye holes) ----
  const fA = { x: xLsel, y: holeH(frontDia) }, rB = { x: xR, y: holeH(rearDia) }, hk = { x: hookX, y: hookY };
  const hkS = { x: Number(SX(hk.x)), y: Number(SY(hk.y)) };
  const fLS = { x: Number(SX(fA.x)), y: Number(SY(fA.y)) };   // front lug (left)
  const rLS = { x: Number(SX(rB.x)), y: Number(SY(rB.y)) };   // rear lug (right)
  const LBLOFF = 20;
  const outNormal = (Ax, Ay, Bx, By, Cx, Cy) => {   // unit normal to A->B pointing away from inside pt C
    let nx = -(By - Ay), ny = (Bx - Ax); const mag = Math.hypot(nx, ny) || 1; nx /= mag; ny /= mag;
    const mx = (Ax + Bx) / 2, my = (Ay + By) / 2;
    if (nx * (mx - Cx) + ny * (my - Cy) < 0) { nx = -nx; ny = -ny; }
    return { nx, ny };
  };
  L2.push(`<line data-role="leg-line" data-leg="front" x1="${SX(hk.x)}" y1="${SY(hk.y)}" x2="${SX(fA.x)}" y2="${SY(fA.y)}" stroke="${frontColor}" stroke-width="3"/>`);
  L2.push(`<line data-role="leg-line" data-leg="rear" x1="${SX(hk.x)}" y1="${SY(hk.y)}" x2="${SX(rB.x)}" y2="${SY(rB.y)}" stroke="${rearColor}" stroke-width="3"/>`);
  {   // front leg label pushed to the OUTSIDE (left), perpendicular to the leg
    const mx = (hkS.x + fLS.x) / 2, my = (hkS.y + fLS.y) / 2, n = outNormal(hkS.x, hkS.y, fLS.x, fLS.y, rLS.x, rLS.y);
    const ax = mx + n.nx * LBLOFF, ay = my + n.ny * LBLOFF, anc = n.nx < 0 ? 'end' : 'start';
    L2.push(`<text data-role="leg-label" data-leg="front" x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" text-anchor="${anc}" fill="${frontColor}" font-weight="600">Front sling ${g.valid ? (g.frontLen/1000).toFixed(2)+' m @ '+g.frontDeg.toFixed(0)+'°' : '—'}</text>`);
  }
  {   // rear leg label pushed to the OUTSIDE (right), perpendicular to the leg
    const mx = (hkS.x + rLS.x) / 2, my = (hkS.y + rLS.y) / 2, n = outNormal(hkS.x, hkS.y, rLS.x, rLS.y, fLS.x, fLS.y);
    const ax = mx + n.nx * LBLOFF, ay = my + n.ny * LBLOFF, anc = n.nx < 0 ? 'end' : 'start';
    L2.push(`<text data-role="leg-label" data-leg="rear" x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" text-anchor="${anc}" fill="${rearColor}" font-weight="600">Rear sling ${g.valid ? (g.rearLen/1000).toFixed(2)+' m @ '+g.rearDeg.toFixed(0)+'°' : '—'}</text>`);
  }
  // crane hook (label centred ABOVE the sling-joint node, one line clear)
  L2.push(`<circle cx="${SX(hk.x)}" cy="${SY(hk.y)}" r="6" fill="#111"/>`);
  L2.push(`<text x="${SX(hk.x)}" y="${(Number(SY(hk.y)) - 30).toFixed(1)}" text-anchor="middle" font-weight="600">Crane hook</text>`);

  // ---- beam (level box girder) ----
  L2.push(`<rect x="${SX(0)}" y="${SY(0)}" width="${Spx(L)}" height="${Spx(depth)}" fill="#d7dce1" stroke="#5b6670" stroke-width="1"/>`);
  L2.push(`<line x1="${SX(0)}" y1="${SY(0)}" x2="${SX(L)}" y2="${SY(0)}" stroke="#2b3038" stroke-width="3"/>`);
  L2.push(`<line x1="${SX(0)}" y1="${SY(-depth)}" x2="${SX(L)}" y2="${SY(-depth)}" stroke="#2b3038" stroke-width="3"/>`);
  // ---- lugs: bell/teardrop padeyes at true mm (front lugs + rear lift lug), boss above the top line ----
  beam.offset_lugs.forEach(l => {
    const sel = l.id === Number(view.lugId);
    const pe = padeyeSvg(l.x_mm, l.dia_mm || frontDia, scale, SX, SY, sel ? '#1f6feb' : '#c9d2da', '#2b3038', 1.3);
    L2.push(pe.svg);
    L2.push(`<text x="${SX(l.x_mm)}" y="${(Number(SY(pe.topY))-6).toFixed(1)}" text-anchor="middle" font-size="16" fill="${sel ? '#1f6feb' : '#5b6670'}" font-weight="${sel ? 700 : 600}">${lugTag(beam, l.id)}</text>`);
  });
  // rear lift lug padeye (labelled R above the boss, no number)
  {
    const pe = padeyeSvg(xR, rearDia, scale, SX, SY, '#c9d2da', '#2b3038', 1.3);
    L2.push(pe.svg);
    L2.push(`<text x="${SX(xR)}" y="${(Number(SY(pe.topY))-6).toFixed(1)}" text-anchor="middle" font-size="16" fill="#5b6670" font-weight="600">R</text>`);
  }
  // self-lift lug: miniature padeye — only when the beam has one; tagged 'self lift' above, no number
  if (beam.self_lift_lug_x_mm != null) {
    const sd = beam.self_lift_lug_dia_mm || 25;
    const pe = padeyeSvg(beam.self_lift_lug_x_mm, sd, scale, SX, SY, '#c9d2da', '#2b3038', 1.0);
    L2.push(pe.svg);
    L2.push(`<text x="${SX(beam.self_lift_lug_x_mm)}" y="${(Number(SY(pe.topY))-5).toFixed(1)}" text-anchor="middle" font-size="13" fill="#8a949e">self lift</text>`);
  }
  // load lug: plate + eye hanging below the beam nose at x=0
  L2.push(loadLugSvg(loadDia, depth, scale, SX, SY));

  // ---- ballast hole circles on the lower flange (letters drawn LAST, over the block) ----
  const railY = -depth * 0.62;
  beam.ballast.holes.forEach((letter, i) => {
    const hx = holeX(i), sel = pick.holeIndex === i;
    L2.push(`<circle data-role="hole" data-hole-i="${i}" cx="${SX(hx)}" cy="${SY(railY)}" r="${(14*scale).toFixed(1)}" fill="${sel ? accent : '#8a949e'}" stroke="#2b3038" stroke-width="0.6"/>`);
  });

  // ---- counterweight block under the chosen ballast position (drawn BEFORE the letters) ----
  const cwTopY = -depth, cwBotY = -(depth + blockH);
  L2.push(`<rect data-role="counterweight" x="${SX(cwCenter - blockW/2)}" y="${SY(cwTopY)}" width="${Spx(blockW)}" height="${Spx(blockH)}" rx="3" fill="${accent}" stroke="#16331f" stroke-width="1.5"/>`);
  pinHoleXs.forEach(px => L2.push(`<line data-role="cw-pin" x1="${SX(px)}" y1="${SY(-depth*0.4)}" x2="${SX(px)}" y2="${SY(cwTopY)}" stroke="#2b3038" stroke-width="2"/>`));
  const cwLabel = pick.hole != null ? `Pos ${pick.hole}` : 'no valid pos';
  const cwLabelX = Math.max(70, Math.min(svgW - 70, Number(SX(cwCenter))));   // keep the middle-anchored label inside the viewBox
  L2.push(`<text x="${cwLabelX}" y="${Number(SY(cwBotY))+16}" text-anchor="middle" fill="#16331f" font-size="17" font-weight="700">C/W ${(beam.counterweight_kg/1000).toFixed(2)} t · ${cwLabel}</text>`);
  if (pick.distFromLugMm != null) L2.push(`<text x="${cwLabelX}" y="${Number(SY(cwBotY))+31}" text-anchor="middle" fill="#333" font-size="16">${(pick.distFromLugMm/1000).toFixed(2)} m from lug ${lugTag(beam, view.lugId)}</text>`);

  // ballast letters LAST — on top of the block, white halo so a number is never hidden
  beam.ballast.holes.forEach((letter, i) => {
    L2.push(`<text data-role="ballast-letter" x="${SX(holeX(i))}" y="${(Number(SY(-depth))+13).toFixed(1)}" text-anchor="middle" font-size="13" fill="#c0392b" paint-order="stroke" stroke="#fff" stroke-width="2.5" stroke-linejoin="round">${letter}</text>`);
  });

  // ---- load hanging from the load lug (below the beam nose) ----
  L2.push(`<text x="${Math.max(80, Number(SX(0)) - 8)}" y="${SY(-depth*0.5)}" text-anchor="end" font-size="17">Load lug</text>`);
  // standard engineering load arrow: bold vertical arrow pointing DOWN, tail attached to the load-lug eye
  {
    const aTopY = loadLugHoleY, aBotY = aTopY - 1200;              // 1200 mm long (world mm x scale)
    const ax = SX(0), yTop = SY(aTopY), yBot = SY(aBotY), hLen = 18, hHalf = 9;
    L2.push(`<line x1="${ax}" y1="${yTop}" x2="${ax}" y2="${(Number(yBot) - hLen).toFixed(1)}" stroke="${accent}" stroke-width="4"/>`);
    L2.push(`<path d="M ${ax} ${yBot} L ${(Number(ax) - hHalf).toFixed(1)} ${(Number(yBot) - hLen).toFixed(1)} L ${(Number(ax) + hHalf).toFixed(1)} ${(Number(yBot) - hLen).toFixed(1)} Z" fill="${accent}"/>`);
    // weight centred BELOW the arrow tip (was beside the shaft)
    L2.push(`<text x="${ax}" y="${(Number(yBot) + 20).toFixed(1)}" text-anchor="middle" fill="${accent}" font-weight="700" font-size="19">${(view.loadKg||0).toLocaleString()} kg</text>`);
  }

  L2.push(`</svg>`);
  return L2.join('');
}

// Maxirig CHAIN-BLOCK mode: a GTC-style two-leg suspension (top sling to the offset lug + rear
// chain/chain-block to the rear lift lug) but drawn with the Maxirig beam artwork — bell padeyes,
// plate load lug, ballast rail + letters. Same draggable #cwt / #chainblk ids + data-attrs as the
// GTC renderer so app.js drag handlers work unchanged. view = { su, chainBlockMm, topChainMm,
// tension, detached, holeIndex, holeXMm, hole, lugId, loadKg, ok, rig }.
function renderMaxirigChainBlock(beam, view) {
  const su = view.su, rig = view.rig || {};
  const depth = beam.beam_depth_mm || 500;
  const blockW = 1000, blockH = 650;
  const xL = su.xL, beta = su.beta, cosB = Math.cos(beta), sinB = Math.sin(beta);
  const ptW = bx => ({ x: su.lugA.x + (bx - xL) * cosB, y: su.lugA.y + (bx - xL) * sinB });
  const toHook = { x: -Math.sin(beta), y: Math.cos(beta) };   // beam normal toward the hook
  const bn = { x: Math.sin(beta), y: -Math.cos(beta) };        // beam normal away from the hook (down)

  const selLug = beam.offset_lugs.find(l => l.id === Number(view.lugId));
  const frontDia = (selLug && selLug.dia_mm) || 40;
  const rearDia = beam.back_lug_dia_mm || (beam.offset_lugs[0] && beam.offset_lugs[0].dia_mm) || 40;
  const loadDia = (beam.load_lug && beam.load_lug.dia_mm) || 40;
  const aH = d => 1.15 * d;   // padeye boss-centre height above the beam top (matches padeyeSvg)

  const hookW = su.hook, loadPtW = ptW(0), rearW = ptW(beam.back_lug_x_mm), holeW = ptW(view.holeXMm);
  // world sling attach points (padeye boss centres), above the beam top toward the hook
  const attach = (bx, d) => ({ x: ptW(bx).x + aH(d) * toHook.x, y: ptW(bx).y + aH(d) * toHook.y });
  const frontA = attach(selLug ? selLug.x_mm : 0, frontDia), rearA = attach(beam.back_lug_x_mm, rearDia);
  // counterweight hangs below the beam and tilts with it; load lug + plumb load hang below the nose
  const blockBot = { x: holeW.x + (depth + blockH) * bn.x, y: holeW.y + (depth + blockH) * bn.y };
  const eyeDrop = depth + loadDia * 1.15;
  const loadEyeW = { x: loadPtW.x + eyeDrop * bn.x, y: loadPtW.y + eyeDrop * bn.y };

  // world bbox (y UP)
  const xs = [hookW.x, loadPtW.x, rearW.x, holeW.x, su.lugA.x, blockBot.x, frontA.x, rearA.x, loadEyeW.x];
  const ys = [hookW.y, loadPtW.y, rearW.y, su.lugA.y, blockBot.y, frontA.y, rearA.y, loadEyeW.y - 1600];
  let minX = Math.min(...xs) - 2200, maxX = Math.max(...xs) + 1100;
  // top margin in SCREEN px (via the width-derived scale) so the beam/sling clear the header text
  const topGapPx = 120, sX = 940 / (maxX - minX);
  let minY = Math.min(...ys) - 700, maxY = Math.max(...ys) + topGapPx / sX;
  if (view.frame) ({ minX, maxX, minY, maxY } = view.frame);   // frozen frame: drag/sliders must not reframe
  const wW = maxX - minX, wH = maxY - minY;
  const targetW = 940, scale = targetW / wW, svgW = targetW, svgH = wH * scale;
  const SX = wx => ((wx - minX) * scale).toFixed(1);
  const SY = wy => ((maxY - wy) * scale).toFixed(1);
  const Spx = mm => (mm * scale).toFixed(1);
  const ok = view.ok, accent = ok ? '#0a7d2c' : '#c0392b';
  const fr = rig.front_sling_deg || { min: 75, max: 90 }, rr = rig.rear_sling_deg || { min: 30, max: 60 };
  // Detached (load set down): beam hangs empty, rig-angle window no longer governs — see GTC renderer.
  const angleGoverns = !view.detached;
  const frontBad = angleGoverns && (su.frontAngleDeg < (fr.min - 0.5) || su.frontAngleDeg > (fr.max + 0.5));
  const rearBad = angleGoverns && (su.rearAngleDeg < (rr.min - 0.5) || su.rearAngleDeg > (rr.max + 0.5));
  const frontColor = (frontBad || !su.valid) ? '#c0392b' : '#1f6feb';
  const rearColor = (rearBad || !su.valid) ? '#c0392b' : '#0a7d2c';
  const capLen = rig.max_sling_len_mm || 8000;
  const overCap = '<tspan fill="#d98c00" font-weight="700"> &#9888;</tspan>';
  const frontOver = capLen && su.valid && su.T > capLen + 1;
  const chainOver = capLen && (view.topChainMm || 0) > capLen + 1;

  const L2 = [];
  L2.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW.toFixed(0)} ${svgH.toFixed(0)}" ` +
    `data-ox="${(-minX * scale).toFixed(3)}" data-scale="${scale.toFixed(6)}" ` +
    `data-minx="${minX.toFixed(3)}" data-maxx="${maxX.toFixed(3)}" data-miny="${minY.toFixed(3)}" data-maxy="${maxY.toFixed(3)}" ` +
    `font-family="system-ui, sans-serif" font-size="22">`);
  L2.push(`<text x="8" y="20" font-size="19" fill="#c0392b" font-weight="700">${beam.id} · ${beam.name} · Tare ${((beam.self_weight_kg + (view.wingKg || 0))/1000).toFixed(2)} t (C/W ${((beam.counterweight_kg + (view.wingKg || 0))/1000).toFixed(2)} t)${view.wingKg ? ` · WING WEIGHTS +${(view.wingKg/1000).toFixed(1)} t` : ''} · CHAIN-BLOCK RIG</text>`);

  // ---- slings (world coords): top sling to the front padeye, rear chain to the rear padeye ----
  L2.push(`<line data-role="leg-line" data-leg="front" x1="${SX(hookW.x)}" y1="${SY(hookW.y)}" x2="${SX(frontA.x)}" y2="${SY(frontA.y)}" stroke="${frontColor}" stroke-width="3"/>`);
  L2.push(`<line data-role="leg-line" data-leg="rear" x1="${SX(hookW.x)}" y1="${SY(hookW.y)}" x2="${SX(rearA.x)}" y2="${SY(rearA.y)}" stroke="${rearColor}" stroke-width="3"/>`);
  const hkS = { x: Number(SX(hookW.x)), y: Number(SY(hookW.y)) };
  const fLS = { x: Number(SX(frontA.x)), y: Number(SY(frontA.y)) };
  const rLS = { x: Number(SX(rearA.x)), y: Number(SY(rearA.y)) };
  const LBLOFF = 20, LBLH = 19;
  const outNormal = (Ax, Ay, Bx, By, Cx, Cy) => {
    let nx = -(By - Ay), ny = (Bx - Ax); const mag = Math.hypot(nx, ny) || 1; nx /= mag; ny /= mag;
    const mx = (Ax + Bx) / 2, my = (Ay + By) / 2;
    if (nx * (mx - Cx) + ny * (my - Cy) < 0) { nx = -nx; ny = -ny; }
    return { nx, ny };
  };
  const TN = view.tension;
  {   // front leg label + tension (outside the triangle)
    const mx = (hkS.x + fLS.x) / 2, my = (hkS.y + fLS.y) / 2, n = outNormal(hkS.x, hkS.y, fLS.x, fLS.y, rLS.x, rLS.y);
    const ax = mx + n.nx * LBLOFF, ay = my + n.ny * LBLOFF, anc = n.nx < 0 ? 'end' : 'start';
    L2.push(`<text data-role="leg-label" data-leg="front" x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" text-anchor="${anc}" fill="${frontColor}" font-weight="600">Top sling ${(su.T/1000).toFixed(2)} m @ ${su.frontAngleDeg.toFixed(0)}&#176;${frontOver ? overCap : ''}</text>`);
    if (TN && TN.valid) L2.push(`<text x="${ax.toFixed(1)}" y="${(ay + LBLH).toFixed(1)}" text-anchor="${anc}" fill="${frontColor}" font-size="19">${TN.slackFront ? 'slack' : 'T ' + TN.frontKN.toFixed(0) + ' kN (' + TN.frontT.toFixed(1) + ' t)'}</text>`);
  }
  {   // rear leg label + tension (outside the triangle)
    const mx = (hkS.x + rLS.x) / 2, my = (hkS.y + rLS.y) / 2, n = outNormal(hkS.x, hkS.y, rLS.x, rLS.y, fLS.x, fLS.y);
    const ax = mx + n.nx * LBLOFF, ay = my + n.ny * LBLOFF, anc = n.nx < 0 ? 'end' : 'start';
    L2.push(`<text data-role="leg-label" data-leg="rear" x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" text-anchor="${anc}" fill="${rearColor}" font-weight="600">Rear chain ${((view.topChainMm||0)/1000).toFixed(2)} m @ ${su.rearAngleDeg.toFixed(0)}&#176;${chainOver ? overCap : ''}</text>`);
    if (TN && TN.valid) L2.push(`<text x="${ax.toFixed(1)}" y="${(ay + LBLH).toFixed(1)}" text-anchor="${anc}" fill="${rearColor}" font-size="19">${TN.slackRear ? 'slack' : 'T ' + TN.rearKN.toFixed(0) + ' kN (' + TN.rearT.toFixed(1) + ' t)'}</text>`);
  }
  // chain block = draggable handle sliding up/down the rear leg (adjusts its length)
  const cbW = { x: hookW.x + 0.6 * (rearA.x - hookW.x), y: hookW.y + 0.6 * (rearA.y - hookW.y) };
  const legPX = Number(SX(rearA.x)) - Number(SX(hookW.x)), legPY = Number(SY(rearA.y)) - Number(SY(hookW.y));
  const legLen = Math.hypot(legPX, legPY) || 1;
  L2.push(`<g id="chainblk" style="cursor:ns-resize" data-ux="${(legPX/legLen).toFixed(5)}" data-uy="${(legPY/legLen).toFixed(5)}">`);
  L2.push(`<title>Drag along the rear leg to adjust the chain block</title>`);
  L2.push(`<rect x="${SX(cbW.x) - 11}" y="${SY(cbW.y) - 15}" width="22" height="30" rx="3" fill="#fff" stroke="#444" stroke-width="1.8"/>`);
  // label DOWN-LEFT of the block with a dashed leader — clear of the block and the rear leg line
  // (which descends to the right). Matches the GTC renderer.
  const cbLblX = (Number(SX(cbW.x)) - 90).toFixed(1), cbLblY = (Number(SY(cbW.y)) + 50).toFixed(1);
  L2.push(`<line x1="${SX(cbW.x)}" y1="${(Number(SY(cbW.y)) + 15).toFixed(1)}" x2="${cbLblX}" y2="${(Number(cbLblY) - 11).toFixed(1)}" stroke="#8b4513" stroke-width="0.8" stroke-dasharray="2 2"/>`);
  L2.push(`<text x="${cbLblX}" y="${cbLblY}" text-anchor="end" fill="#8b4513" font-weight="600">chain block ${(view.chainBlockMm/1000).toFixed(2)} m</text>`);
  L2.push(`</g>`);
  // crane hook (label centred ABOVE the sling-joint node, one line clear)
  L2.push(`<circle cx="${SX(hookW.x)}" cy="${SY(hookW.y)}" r="6" fill="#111"/>`);
  L2.push(`<text x="${SX(hookW.x)}" y="${(Number(SY(hookW.y)) - 30).toFixed(1)}" text-anchor="middle" font-weight="600">Crane hook</text>`);

  // ---- beam assembly (rotated group: local x along beam from the load point, +y down) ----
  const ang = (-beta * 180 / Math.PI).toFixed(3);
  const SXg = mm => (mm * scale).toFixed(1);   // local (group) mm -> px, x along beam
  const SYg = mm => (-mm * scale).toFixed(1);  // world y-UP mm -> local up (negative screen-y in group)
  const lx = bx => (bx * scale).toFixed(1);
  const holeX = i => beam.ballast.holes_x_mm ? beam.ballast.holes_x_mm[i] : beam.ballast.first_hole_x_mm + beam.ballast.pitch_mm * i;
  L2.push(`<g transform="translate(${SX(loadPtW.x)},${SY(loadPtW.y)}) rotate(${ang})">`);
  L2.push(`<rect x="0" y="0" width="${Spx(beam.length_mm)}" height="${Spx(depth)}" fill="#d7dce1" stroke="#5b6670" stroke-width="1"/>`);
  L2.push(`<line x1="0" y1="0" x2="${Spx(beam.length_mm)}" y2="0" stroke="#2b3038" stroke-width="3"/>`);
  L2.push(`<line x1="0" y1="${Spx(depth)}" x2="${Spx(beam.length_mm)}" y2="${Spx(depth)}" stroke="#2b3038" stroke-width="3"/>`);
  // bell padeyes at the offset lugs (selected highlighted) + the rear lift lug ('R')
  beam.offset_lugs.forEach(l => {
    const sel = l.id === Number(view.lugId);
    const pe = padeyeSvg(l.x_mm, l.dia_mm || frontDia, scale, SXg, SYg, sel ? '#1f6feb' : '#c9d2da', '#2b3038', 1.3);
    L2.push(pe.svg);
    L2.push(`<text x="${lx(l.x_mm)}" y="${(-(aH(l.dia_mm || frontDia) + 42) * scale).toFixed(1)}" text-anchor="middle" font-size="16" fill="${sel ? '#1f6feb' : '#5b6670'}" font-weight="${sel ? 700 : 600}">${lugTag(beam, l.id)}</text>`);
  });
  {
    const pe = padeyeSvg(beam.back_lug_x_mm, rearDia, scale, SXg, SYg, '#c9d2da', '#2b3038', 1.3);
    L2.push(pe.svg);
    L2.push(`<text x="${lx(beam.back_lug_x_mm)}" y="${(-(aH(rearDia) + 42) * scale).toFixed(1)}" text-anchor="middle" font-size="16" fill="#5b6670" font-weight="600">R</text>`);
  }
  // load lug plate + eye below the beam nose at x=0
  L2.push(loadLugSvg(loadDia, depth, scale, SXg, SYg));
  // ballast rail + hole circles (letters drawn LAST, over the counterweight block)
  const railY = depth * 0.62;
  L2.push(`<line x1="${lx(holeX(0))}" y1="${Spx(depth*0.44)}" x2="${lx(holeX(beam.ballast.holes.length-1))}" y2="${Spx(depth*0.44)}" stroke="#5b6670" stroke-width="1"/>`);
  beam.ballast.holes.forEach((letter, i) => {
    const sel = i === view.holeIndex;
    L2.push(`<circle data-role="hole" data-hole-i="${i}" cx="${lx(holeX(i))}" cy="${Spx(railY)}" r="${(14*scale).toFixed(1)}" fill="${sel ? accent : '#8a949e'}" stroke="#2b3038" stroke-width="0.6"/>`);
  });
  // counterweight rigidly bolted below the beam (draggable, snaps to holes) — tilts with the beam
  const cwx = view.holeXMm * scale, bw = blockW * scale, bh = blockH * scale;
  const cwtFromLugMm = view.holeXMm - (selLug ? selLug.x_mm : 0);
  const boltTop = depth * 0.45 * scale, blockTop = (depth + 40) * scale;
  L2.push(`<g id="cwt" style="cursor:grab">`);
  L2.push(`<title>Drag to move ballast (snaps to holes)</title>`);
  L2.push(`<line data-role="cw-pin" x1="${cwx.toFixed(1)}" y1="${boltTop.toFixed(1)}" x2="${cwx.toFixed(1)}" y2="${(blockTop + bh * 0.3).toFixed(1)}" stroke="#2b3038" stroke-width="2.5"/>`);
  L2.push(`<rect x="${(cwx - bw / 2).toFixed(1)}" y="${blockTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${accent}" stroke="#16331f" stroke-width="1.5"/>`);
  L2.push(`<text x="${cwx.toFixed(1)}" y="${(blockTop + bh + 14).toFixed(1)}" text-anchor="middle" fill="#16331f" font-size="17" font-weight="700">${((beam.counterweight_kg + (view.wingKg || 0)) / 1000).toFixed(2)} t${view.wingKg ? ' (incl. wings)' : ''} · Hole ${view.hole}</text>`);
  L2.push(`<text x="${cwx.toFixed(1)}" y="${(blockTop + bh + 28).toFixed(1)}" text-anchor="middle" fill="#333" font-size="16">${(cwtFromLugMm/1000).toFixed(2)} m from lug ${lugTag(beam, view.lugId)}</text>`);
  L2.push(`</g>`);
  // ballast letters LAST (over the block, white halo)
  const nHoles = beam.ballast.holes.length;
  const holePitchPx = nHoles > 1 ? Math.abs(holeX(1) - holeX(0)) * scale : 999;
  const lblStep = Math.max(1, Math.ceil(16 / holePitchPx));
  beam.ballast.holes.forEach((letter, i) => {
    const onStep = i % lblStep === 0 && (nHoles - 1 - i) >= lblStep;
    if (!onStep && i !== nHoles - 1 && i !== view.holeIndex) return;
    L2.push(`<text data-role="ballast-letter" x="${lx(holeX(i))}" y="${Spx(depth + 170)}" text-anchor="middle" font-size="15" fill="#c0392b" paint-order="stroke" stroke="#fff" stroke-width="3" stroke-linejoin="round">${letter}</text>`);
  });
  L2.push(`</g>`);

  // ---- load hanging plumb from the load-lug eye (or the ground when detached) ----
  L2.push(`<text x="${Math.max(80, Number(SX(loadEyeW.x)) - 8)}" y="${SY(loadPtW.y - 300)}" text-anchor="end" font-size="17">Load lug</text>`);
  if (view.detached) {
    // detached: NO load representation (no arrow, no box) — just the ground line + caption; the beam
    // has already swung (su computed with zero load).
    const groundY = minY + 500;
    L2.push(`<line x1="${SX(minX + 200)}" y1="${SY(groundY)}" x2="${SX(loadEyeW.x + 2000)}" y2="${SY(groundY)}" stroke="#9aa" stroke-width="2"/>`);
    L2.push(`<text x="${SX(loadEyeW.x)}" y="${SY(groundY - 250)}" text-anchor="middle" font-size="19" fill="#c0392b">detached (on ground)</text>`);
  } else {
    const aTopY = loadEyeW.y, aBotY = aTopY - 1200, ax = SX(loadEyeW.x), yTop = SY(aTopY), yBot = SY(aBotY), hLen = 18, hHalf = 9;
    L2.push(`<line data-role="load-arrow" x1="${ax}" y1="${yTop}" x2="${ax}" y2="${(Number(yBot) - hLen).toFixed(1)}" stroke="${accent}" stroke-width="4"/>`);
    L2.push(`<path data-role="load-arrow" d="M ${ax} ${yBot} L ${(Number(ax) - hHalf).toFixed(1)} ${(Number(yBot) - hLen).toFixed(1)} L ${(Number(ax) + hHalf).toFixed(1)} ${(Number(yBot) - hLen).toFixed(1)} Z" fill="${accent}"/>`);
    // weight centred BELOW the arrow tip (was beside the shaft)
    L2.push(`<text data-role="load-kg" x="${ax}" y="${(Number(yBot) + 20).toFixed(1)}" text-anchor="middle" fill="${accent}" font-weight="700" font-size="19">${(view.loadKg||0).toLocaleString()} kg</text>`);
  }

  L2.push(`</svg>`);
  return L2.join('');
}

// Bell/teardrop padeye (Maxirig lug family) sized in REAL mm from the lug's hole dia and the drawing
// scale: a circular boss (radius ~1.5x hole radius) centred above the beam top line, two tangent
// flanks splaying to a flat base ON the top line (base ~2.4x hole dia), white hole at the boss centre.
// World coords are y-UP with the beam top at y=0; SX/SY map world mm to screen px. The crown is
// sampled as a polyline so the outline is robust regardless of beam size (no arc-flag ambiguity).
function padeyeSvg(cx, dia, scale, SX, SY, fill, stroke, sw) {
  const rh = dia / 2, rb = 1.5 * rh, halfBase = 1.2 * dia, H = 1.15 * dia;
  const d = Math.hypot(halfBase, H), ang = Math.acos(Math.min(1, rb / d));
  const gamma = Math.atan2(-H, halfBase);                        // base-corner -> boss-centre direction
  const cand = [gamma + ang, gamma - ang].map(t => [rb * Math.cos(t), H + rb * Math.sin(t)]);
  const TR = cand[0][0] > cand[1][0] ? cand[0] : cand[1];        // outer (right) tangent point, local
  const TL = [-TR[0], TR[1]];
  let aL = Math.atan2(TL[1] - H, TL[0]), aR = Math.atan2(TR[1] - H, TR[0]);
  if (aL <= aR) aL += 2 * Math.PI;                               // sweep aL->aR (over the crown)
  const N = 26, pts = [[cx - halfBase, 0]];                      // base-left corner on the top line
  for (let i = 0; i <= N; i++) { const p = aL + (aR - aL) * i / N; pts.push([cx + rb * Math.cos(p), H + rb * Math.sin(p)]); }
  pts.push([cx + halfBase, 0]);                                  // base-right corner
  const poly = pts.map(p => `${SX(p[0])},${SY(p[1])}`).join(' ');
  const svg = `<polygon points="${poly}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`
    + `<circle cx="${SX(cx)}" cy="${SY(H)}" r="${(rh * scale).toFixed(1)}" fill="#fff" stroke="${stroke}" stroke-width="1.1"/>`;
  return { svg, attachY: H, topY: H + rb };
}

// Load lug: a plate + eye hanging below the beam nose at x=0 (rounded lower eye, white hole of the
// load-lug dia). Real mm; the beam underside is at world y=-depth.
function loadLugSvg(dia, depth, scale, SX, SY) {
  const rh = dia / 2, boss = dia * 0.85, neckHalf = dia * 0.45;
  const holeY = -depth - dia * 1.15, neckTop = -depth + dia * 0.1;
  return `<rect x="${SX(-neckHalf)}" y="${SY(neckTop)}" width="${(2 * neckHalf * scale).toFixed(1)}" height="${((neckTop - holeY) * scale).toFixed(1)}" fill="#c9d2da" stroke="none"/>`
    + `<circle cx="${SX(0)}" cy="${SY(holeY)}" r="${(boss * scale).toFixed(1)}" fill="#c9d2da" stroke="#2b3038" stroke-width="1.3"/>`
    + `<circle cx="${SX(0)}" cy="${SY(holeY)}" r="${(rh * scale).toFixed(1)}" fill="#fff" stroke="#2b3038" stroke-width="1.1"/>`;
}

// GTC cleat base extents (mm), clamped so the 200 mm base never runs past either beam end while the
// hole stays at the true lug x. Exported for the geometry test.
function gtcLugBaseMm(beam, bxMm) {
  const half = 100;   // clBase/2, 200 mm base
  return { leftMm: Math.max(0, bxMm - half), rightMm: Math.min(beam.length_mm, bxMm + half) };
}

if (typeof module !== 'undefined') module.exports = { renderDiagram, gtcLugBaseMm, padeyeSvg };
