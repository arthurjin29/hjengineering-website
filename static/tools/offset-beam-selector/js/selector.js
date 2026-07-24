// js/selector.js
// Resolve the GTC-style rigging used by the moment-calc path. GTC beams carry it verbatim; Maxirig
// beams have no such block, so derive one: 8 m soft cap, GTC front/chain-block bands, rear-angle
// window from beam.rigging.max_rear_deg (else 30-60 deg, flagged as assumed). Shared by app.js and
// findSuitableBeams so there is one source of truth.
function resolveRig(beam) {
  if (!beam) return null;
  if (beam.maker !== 'Maxirig') return beam.rigging;
  const mr = beam.rigging && beam.rigging.max_rear_deg;
  return {
    head_height_mm: 3000, max_sling_len_mm: 8000,
    chain_block_mm: { min: 500, max: 6000 },
    front_sling_deg: { min: 75, max: 90 },
    rear_sling_deg: { min: 30, max: mr != null ? mr : 60 },
    rearAssumed: mr == null
  };
}

function lugById(beam, lugId) {
  return beam.offset_lugs.find(l => l.id === Number(lugId));
}

// Display label for an offset lug: the source chart's own lug tag when the chart letters its lugs
// (OLB-1 = A/B, OLB-14 = A/B/C) — else the numeric id. Internal ids stay numeric; this is display
// only, so a rigger reading the app sees the same lug label as the physical GTC chart.
function lugLabel(beam, lugId) {
  const l = beam.offset_lugs.find(x => x.id === Number(lugId));
  return (l && l.chart_lug_label) || String(lugId);
}

// Ballast hole X for an index. Beams may give EXPLICIT positions (`ballast.holes_x_mm`,
// e.g. unequally-spaced pins) — preferred; otherwise the constant first_hole + pitch·i.
function holeXAt(beam, i) {
  const b = beam.ballast;
  return b.holes_x_mm ? b.holes_x_mm[i] : b.first_hole_x_mm + b.pitch_mm * i;
}

// A chart cell the maker struck out ("Not To Be Used" / "PIN ONLY") marks a PROHIBITED lug+position
// combination, not merely an unpriced one. This is distinct from the GTC chart's NUMERIC values,
// which remain a guide only (the moment calc governs balance) — a struck-out cell is a hard stop.
// Wings bolt ON TO the existing counterweight ("LOAD CHART WITH WING WEIGHTS ADDED TO EXISTING
// COUNTERWEIGHT", MR11462 op guide p10), so when they are fitted the amended chart governs — it is
// STRICTER than the base one (MR11462 lug 1 loses E-J, lug 2 loses I-J).
function chartFor(beam, useWing) {
  const alt = useWing && beam.alt_charts && beam.alt_charts.wing_weights;
  return (alt && alt.capacity_kg) || beam.capacity_kg;
}
function positionAllowed(beam, lugId, holeIndex, useWing) {
  const hole = beam.ballast.holes[holeIndex];
  return (chartFor(beam, useWing)[String(lugId)] || {})[hole] != null;
}

// Geometry-driven balance (moment calc is the sole authority; the GTC chart is a guide only).
// The counterweight must balance or OVER-balance the load so the back chain stays in tension and
// holds the rear down. Choose the hole with the LEAST over-balance (smallest balancing load that
// is still >= the load); under-balancing (load-heavy) is unsafe — the back chain would go slack.
function balanceBallast(beam, lugId, loadKg, wingKg) {
  const lug = lugById(beam, lugId);
  const xL = lug.x_mm;
  // Maker-aware structural beam mass: Maxirig self_weight_kg bundles the counterweight, so the
  // structural mass is beam_only_kg (using self_weight_kg would double-count the C/W). The movable
  // ballast/counterweight is beam.ballast_kg for both makers; wing weights add to it when fitted.
  const B = beam.maker === 'Maxirig' ? beam.beam_only_kg : beam.self_weight_kg;
  const P = beam.ballast_kg + (wingKg || 0), cog = beam.beam_cog_x_mm;
  const xBallastMm = xL + (loadKg * xL - B * (cog - xL)) / P;   // ballast X for an EXACT balance
  const n = beam.ballast.holes.length;
  // Only positions the maker rates for THIS lug are candidates — never recommend a struck-out cell.
  // Every lug charts at least one rated position; the fallback keeps this total if that changes.
  const useWing = wingKg > 0;   // wings ride the C/W, so the amended (stricter) chart applies
  let allowed = [];
  for (let i = 0; i < n; i++) if (positionAllowed(beam, lugId, i, useWing)) allowed.push(i);
  const noRatedPositions = !allowed.length;   // data error: a lug with no rated cell at all
  if (noRatedPositions) {
    // Never fail silently — a fully-nulled lug column means bad chart data, not a liftable beam.
    // capacityCheck still rejects every hole here, so the calc fails closed as well as loudly.
    if (typeof console !== 'undefined') console.warn('[beams.json] ' + beam.id + ' lug ' + lugId +
      ' has no rated counterweight position — prohibition filter disabled for this lug.');
    for (let i = 0; i < n; i++) allowed.push(i);
  }
  let chosen = -1, chosenBL = Infinity, maxBL = -Infinity, maxIdx = allowed[0];
  for (const i of allowed) {
    const bl = balancingLoad(beam, lugId, i, wingKg);
    if (bl > maxBL) { maxBL = bl; maxIdx = i; }
    if (bl >= loadKg - 0.5 && bl < chosenBL) { chosenBL = bl; chosen = i; }
  }
  const supported = chosen >= 0;                  // a hole can balance/over-balance the load
  const holeIndex = supported ? chosen : maxIdx;  // else show the rear-most (max C/W moment)
  const balancesKg = balancingLoad(beam, lugId, holeIndex, wingKg);
  return {
    xBallastMm, holeIndex, hole: beam.ballast.holes[holeIndex],
    holeXMm: holeXAt(beam, holeIndex), residualMm: xBallastMm - holeXAt(beam, holeIndex),
    balancesKg, overBalanceKg: balancesKg - loadKg,
    maxBalanceKg: maxBL,                          // most the C/W can balance at this lug
    supported, inRange: supported,                // inRange kept = liftable flag (app.js compat)
    noRatedPositions                              // true = chart data error, filter was bypassed
  };
}

// Structural ceiling = the beam WLL. The per-cell GTC chart value is informational only (a guide).
// Maxirig branch: the per-cell value is a CERTIFIED capacity (governing), still capped at WLL.
function capacityCheck(beam, lugId, hole, loadKg, useWing) {
  const wllKg = beam.wll_t * 1000;
  const capacityKg = (chartFor(beam, useWing)[String(lugId)] || {})[hole];   // chart cell value
  if (beam.maker === 'Maxirig') {
    const cellKg = (capacityKg == null) ? null : Math.min(capacityKg, wllKg);   // certified cell, capped at WLL
    const governingKg = (cellKg == null) ? 0 : cellKg;
    let ok = true, reason = '';
    if (!(loadKg > 0)) { ok = false; reason = 'invalid_load'; }
    else if (cellKg == null) { ok = false; reason = 'not_rated'; }   // PIN ONLY / DO NOT USE cell
    else if (loadKg > governingKg) { ok = false; reason = loadKg > wllKg ? 'over_wll' : 'over_chart'; }
    return { ok, capacityKg, governingKg, wllKg, utilisation: governingKg ? loadKg / governingKg : null,
      reason, capacitySource: 'certified_chart' };
  }
  let ok = true, reason = '';
  if (!(loadKg > 0)) { ok = false; reason = 'invalid_load'; }
  // A struck-out cell is a maker PROHIBITION on this lug+position pair, so it fails outright. The
  // numeric cells stay advisory for GTC (moment calc governs balance) — only the strike-out binds.
  else if (capacityKg == null) { ok = false; reason = 'not_rated'; }
  else if (loadKg > wllKg) { ok = false; reason = 'over_wll'; }
  return { ok, capacityKg, wllKg, utilisation: wllKg ? loadKg / wllKg : null, reason, capacitySource: 'wll' };
}

// Fixed two-leg sling to a single hook (Maxirig): front sling (front_mm) at the chosen offset lug,
// rear sling (rear_mm) at the rear lift lug, beam level when loaded. The hook is the two-circle
// intersection above the beam. Returns both leg lengths, leg angles from horizontal, the hook
// position (datum x, height above the lug line) and the hook offset (toward rear) of the front lug.
function fixedSlingGeometry(beam, lugId) {
  const lug = lugById(beam, lugId);
  const sl = (beam.rigging && beam.rigging.sling_lengths || []).find(s => s.lug === Number(lugId));
  if (!lug || !sl) return { valid: false };
  const xL = lug.x_mm, xR = beam.back_lug_x_mm, R = xR - xL;
  const frontLen = sl.front_mm, rearLen = sl.rear_mm;
  const hookX = xL + (R * R + frontLen * frontLen - rearLen * rearLen) / (2 * R);
  const disc = frontLen * frontLen - (hookX - xL) * (hookX - xL);
  const valid = R > 0 && disc >= 0;
  const hookY = valid ? Math.sqrt(disc) : 0;
  const frontDeg = Math.atan2(hookY, Math.abs(hookX - xL)) * 180 / Math.PI;
  const rearDeg = Math.atan2(hookY, Math.abs(xR - hookX)) * 180 / Math.PI;
  return { valid, frontLen, rearLen, frontDeg, rearDeg, hookX, hookY, hookOffsetMm: hookX - xL };
}

function slingGeometry(beam, lugId, angleDeg) {
  const lug = lugById(beam, lugId);
  // GTC beams carry min_backchain_angle_deg; Maxirig (chain-block mode) does not — default to 30°.
  const min = beam.min_backchain_angle_deg != null ? beam.min_backchain_angle_deg : 30;
  let a = (angleDeg == null) ? min : angleDeg;
  let clamped = false;
  if (a < min) { a = min; clamped = true; }   // rear sling must be at least this steep
  if (a > 89) { a = 89; clamped = true; }      // cannot reach vertical (that is the top sling)
  const runMm = beam.back_lug_x_mm - lug.x_mm;
  const rad = a * Math.PI / 180;
  const headHeightMm = runMm * Math.tan(rad);
  return {
    runMm, angleDeg: a, headHeightMm,
    topSlingMm: headHeightMm,
    backChainMm: Math.sqrt(headHeightMm * headHeightMm + runMm * runMm),
    angleClamped: clamped
  };
}

// Combined CoG (load + beam + ballast) as a beam-x coordinate (mm from load point).
function combinedCogX(beam, lugId, loadKg, holeIndex, wingKg) {
  // Maker-aware masses (see balanceBallast): Maxirig structural mass = beam_only_kg; the C/W is
  // beam.ballast_kg (+ wing weights when fitted). The certified chart still governs CAPACITY.
  const B = beam.maker === 'Maxirig' ? beam.beam_only_kg : beam.self_weight_kg;
  const P = beam.ballast_kg + (wingKg || 0);
  const xBallast = holeXAt(beam, holeIndex);
  const total = loadKg + B + P;
  return (loadKg * 0 + B * beam.beam_cog_x_mm + P * xBallast) / total;
}

// Two-leg suspension: front (top) sling length T to the offset lug, rear leg length Lr
// (chain block) to the rear lug. The beam tilts to equilibrium (combined CoG under the hook).
// Returns geometry incl. tilt, both sling angles, the rear-leg length that levels the beam,
// and world positions (hook at origin, y UP, mm) for drawing.
function suspensionGeometry(beam, lugId, holeIndex, loadKg, headMm, rearLegMm, wingKg) {
  const lug = lugById(beam, lugId);
  const xL = lug.x_mm;
  const R = beam.back_lug_x_mm - xL;            // offset lug -> rear lug along beam
  const T = headMm, Lr = rearLegMm;
  // Wings ride the C/W, so they MUST be in the CoG here — omitting them tilts the solved geometry
  // and reports a false angle failure on a rig that is actually level.
  const c = combinedCogX(beam, lugId, loadKg, holeIndex, wingKg) - xL;   // CoG distance from offset lug

  const cosA = (T * T + R * R - Lr * Lr) / (2 * T * R);
  const valid = cosA >= -1 && cosA <= 1;        // triangle closes (legs taut, not over/under)
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));      // angle at offset lug (HAB)
  const beta = Math.atan2(T * Math.cos(alpha) - c, T * Math.sin(alpha)); // beam tilt, +=rear up
  const frontAngle = beta + alpha;              // front sling, from horizontal
  const LrLevel = Math.sqrt(Math.max(0, T * T + R * R - 2 * R * c)); // rear leg that gives beta=0

  // world positions (hook at origin, y up)
  const hook = { x: 0, y: 0 };
  const A = { x: hook.x - T * Math.cos(frontAngle), y: hook.y - T * Math.sin(frontAngle) };
  const dir = { x: Math.cos(beta), y: Math.sin(beta) };        // beam unit vector (A -> rear)
  const Bp = { x: A.x + R * dir.x, y: A.y + R * dir.y };
  const rearAngle = Math.atan2(Math.abs(hook.y - Bp.y), Math.abs(hook.x - Bp.x)); // rear sling incline from horizontal

  return {
    R, T, Lr, c, valid,
    tiltDeg: beta * 180 / Math.PI,
    frontAngleDeg: frontAngle * 180 / Math.PI,
    rearAngleDeg: rearAngle * 180 / Math.PI,
    LrLevel,
    level: Math.abs(beta) < 0.0017,             // ~0.1 deg
    hook, lugA: A, beta, xL                      // for the diagram (mm, y up)
  };
}

// GTC chart guide: the chart's nearest usable C/W position for a load. The printed chart can
// differ from the moment calculation (it is a guide); the moment calc is authoritative for balance.
function chartGuide(beam, lugId, loadKg, useWing) {
  // Must follow the SAME chart as the prohibition rule, or the guide can name a position the
  // governing chart strikes out — exactly what "a struck-out cell is a hard stop" forbids.
  const col = chartFor(beam, useWing)[String(lugId)];
  if (!col) return null;
  let best = null;
  beam.ballast.holes.forEach((h, i) => {
    const c = col[h];
    if (c != null && (best === null || Math.abs(c - loadKg) < Math.abs(best.cap - loadKg)))
      best = { hole: h, holeIndex: i, cap: c };
  });
  return best;
}

// Static sling/leg tensions: rigid beam suspended from the hook by the front (top) sling at the
// offset lug and the rear leg at the rear lug. Solve  T_front·û_front + T_rear·û_rear = (0, W)
// using the LIVE sling directions, so tensions track tilt / chain-block changes. W = total kgf.
// At perfect balance the front sling is vertical over the combined CoG -> front ≈ W, rear ≈ 0.
function slingTensions(su, totalKg) {
  if (!su || !su.valid) return { valid: false };
  const A = su.lugA;                                        // front lug (world, y up), hook at origin
  const B = { x: A.x + su.R * Math.cos(su.beta), y: A.y + su.R * Math.sin(su.beta) };  // rear lug
  const unit = v => { const m = Math.hypot(v.x, v.y) || 1; return { x: v.x / m, y: v.y / m }; };
  const uf = unit({ x: -A.x, y: -A.y });                    // front lug -> hook
  const ur = unit({ x: -B.x, y: -B.y });                    // rear lug -> hook
  const det = uf.x * ur.y - ur.x * uf.y;
  let frontKg = det ? -ur.x * totalKg / det : totalKg;
  let rearKg = det ? uf.x * totalKg / det : 0;
  const slackFront = frontKg < -1, slackRear = rearKg < -1;  // a sling cannot push
  frontKg = Math.max(0, frontKg); rearKg = Math.max(0, rearKg);
  const G = 9.80665 / 1000;                                 // kgf -> kN
  return {
    valid: true, frontKg, rearKg, slackFront, slackRear,
    frontKN: frontKg * G, rearKN: rearKg * G, frontT: frontKg / 1000, rearT: rearKg / 1000
  };
}

// Inverse of balance: the load that the beam balances when ballast sits at holeIndex (0=A).
function balancingLoad(beam, lugId, holeIndex, wingKg) {
  const lug = lugById(beam, lugId);
  const xL = lug.x_mm;
  const xBallast = holeXAt(beam, holeIndex);
  const B = beam.maker === 'Maxirig' ? beam.beam_only_kg : beam.self_weight_kg;   // maker-aware mass (see balanceBallast)
  const P = beam.ballast_kg + (wingKg || 0);
  return (B * (beam.beam_cog_x_mm - xL) + P * (xBallast - xL)) / xL;
}

// Assess a user-chosen ballast hole (used when dragging the counterweight).
function evaluateHole(beam, lugId, holeIndex, loadKg, angleDeg, wingKg) {
  const useWing = wingKg > 0;
  const hole = beam.ballast.holes[holeIndex];
  const holeXMm = holeXAt(beam, holeIndex);
  const balancingLoadKg = balancingLoad(beam, lugId, holeIndex, wingKg);
  const overBalanceKg = balancingLoadKg - loadKg;        // >0 = C/W heavy -> back chain restrains
  const supported = overBalanceKg >= -0.5;               // this hole balances or over-balances
  const residualMm = balanceBallast(beam, lugId, loadKg, wingKg).xBallastMm - holeXMm;
  const capacity = capacityCheck(beam, lugId, hole, loadKg, useWing);
  const geometry = slingGeometry(beam, lugId, angleDeg);
  const messages = [];
  if (capacity.reason === 'invalid_load') messages.push('Enter a load greater than 0.');
  if (capacity.reason === 'over_wll') messages.push('Load exceeds beam WLL (' + capacity.wllKg + ' kg).');
  if (capacity.reason === 'not_rated') messages.push('Position ' + hole + ' is struck out for lug ' +
    lugLabel(beam, lugId) + ' on the maker chart — this combination must not be used. Choose a rated position.');
  if (capacity.reason === 'over_chart') messages.push('Load exceeds the certified capacity for lug ' +
    lugLabel(beam, lugId) + ' at position ' + hole + ' (' + capacity.governingKg.toFixed(0) + ' kg).');
  if (!supported) {
    // Only send the operator rearward if a RATED position actually balances more than this one —
    // on lugs whose rear positions are all struck out, "move toward the rear" points at prohibited
    // holes, which is the opposite of what the chart says.
    const heavier = beam.ballast.holes.some((h, i) => positionAllowed(beam, lugId, i, useWing) &&
      balancingLoad(beam, lugId, i, wingKg) > balancingLoadKg + 0.5);
    messages.push('Hole ' + hole + ' balances only ' + balancingLoadKg.toFixed(0) +
      ' kg — under the ' + loadKg + ' kg load (counterweight too light here; back chain would go slack). ' +
      (heavier ? 'Move the counterweight toward the rear.'
               : 'No rated position at lug ' + lugLabel(beam, lugId) + ' balances this load — use a different offset lug.'));
  }
  else if (overBalanceKg > 1) messages.push('Counterweight over-balances by ' + overBalanceKg.toFixed(0) +
    ' kg — the back chain restrains the residual.');
  if (geometry.angleClamped) messages.push(
    'Back-chain angle adjusted to ' + geometry.angleDeg + '° (min ' + beam.min_backchain_angle_deg + '°).');
  return { holeIndex, hole, holeXMm, balancingLoadKg, overBalanceKg, supported, residualMm,
           inRange: supported, capacity, geometry, ok: supported && capacity.ok, messages };
}

function selectConfig(beam, lugId, loadKg, angleDeg) {
  const balance = balanceBallast(beam, lugId, loadKg);
  const capacity = capacityCheck(beam, lugId, balance.hole, loadKg);
  const geometry = slingGeometry(beam, lugId, angleDeg);
  const messages = [];
  if (capacity.reason === 'invalid_load') messages.push('Enter a load greater than 0.');
  if (capacity.reason === 'over_wll') messages.push('Load exceeds beam WLL (' + capacity.wllKg + ' kg).');
  if (capacity.reason === 'not_rated') messages.push('No rated counterweight position at lug ' + lugLabel(beam, lugId) +
    ' balances this load — the positions that would balance it are struck out on the maker chart.');
  if (capacity.reason === 'over_chart') messages.push('Load exceeds the certified capacity for lug ' +
    lugLabel(beam, lugId) + ' at position ' + balance.hole + ' (' + capacity.governingKg.toFixed(0) + ' kg).');
  if (!balance.supported) messages.push(
    'Counterweight cannot balance this load at this lug — even the rear-most position only balances ' +
    balance.maxBalanceKg.toFixed(0) + ' kg. Try a different offset lug.');
  else if (balance.overBalanceKg > 1) messages.push('Set ballast at hole ' + balance.hole +
    ' (balances ' + balance.balancesKg.toFixed(0) + ' kg); back chain restrains the ' +
    balance.overBalanceKg.toFixed(0) + ' kg over-balance.');
  if (geometry.angleClamped) messages.push('Back-chain angle adjusted to ' + geometry.angleDeg + '° (min ' + beam.min_backchain_angle_deg + '°).');
  return { ok: capacity.ok && balance.supported, hole: balance.hole, balance, capacity, geometry, messages };
}

// Max usable load at a lug = the most the counterweight can balance (rear-most hole, by moment
// calc), capped at the beam WLL. Used to default the load input when a lug is picked.
function maxWllAtLug(beam, lugId, wingKg) {
  const wllKg = (beam.wll_t || 0) * 1000;
  const useWing = wingKg > 0;
  let maxBal = 0;
  // Only RATED positions count: a load reachable solely from a struck-out position is not usable,
  // and offering it as the default would open the tool on a load no legal position can balance.
  for (let i = 0; i < beam.ballast.holes.length; i++) {
    if (positionAllowed(beam, lugId, i, useWing)) maxBal = Math.max(maxBal, balancingLoad(beam, lugId, i, wingKg));
  }
  return wllKg ? Math.min(maxBal, wllKg) : maxBal;
}

// Build the reference load-chart table HTML for a beam (pure — no DOM).
// Rows = counterweight positions printed top-to-bottom as on the source chart:
// Maxirig prints rear-most / max-capacity first (holes reversed); GTC uses native order.
// Columns = rated lugs. A cell shows its capacity in kg (thousands separator), or a special
// text (PIN ONLY / DO NOT USE / capacity note) from chart_cells_note, or "Not To Be Used" for
// an unrated (null) cell with no note. opts: { useWing, selLugId, recHole } — selLugId shades
// the lug column and recHole shades the recommended position row (both set only after a Calculate).
function chartTableHtml(beam, opts) {
  opts = opts || {};
  const alt = opts.useWing && beam.alt_charts && beam.alt_charts.wing_weights;
  const chart = alt ? alt.capacity_kg : beam.capacity_kg;
  const notes = (alt ? alt.chart_cells_note : beam.chart_cells_note) || {};
  const isMax = beam.maker === 'Maxirig';
  const lugIds = Object.keys(chart);
  const holes = isMax ? beam.ballast.holes.slice().reverse() : beam.ballast.holes.slice();
  const header = isMax
    ? (alt ? 'Certified wing-weights chart (governing)' : 'Certified capacity chart (governing)')
    : 'GTC chart (guide only — moment calc governs balance)';
  const selLug = opts.selLugId != null ? String(opts.selLugId) : null;
  const recHole = opts.recHole != null ? String(opts.recHole) : null;
  const cell = (lug, h) => {
    const note = notes[lug] && notes[lug][h];
    if (note) return { txt: note, special: true };
    const v = chart[lug] ? chart[lug][h] : undefined;
    if (v == null) return { txt: 'Not To Be Used', special: true };
    return { txt: Number(v).toLocaleString(), special: false };
  };
  const thead = '<tr><th class="poscol">C/W Pos</th>' +
    lugIds.map(l => `<th class="${l === selLug ? 'sel' : ''}">Lug ${lugLabel(beam, l)}</th>`).join('') + '</tr>';
  const rows = holes.map(h => {
    const tds = lugIds.map(l => {
      const c = cell(l, h);
      const cls = [c.special ? 'special' : '', l === selLug ? 'sel' : ''].filter(Boolean).join(' ');
      return `<td class="${cls}">${c.txt}</td>`;
    }).join('');
    return `<tr class="${h === recHole ? 'recrow' : ''}"><th class="poscol">${h}</th>${tds}</tr>`;
  }).join('');
  return `<div class="chart-hdr">${header}</div>` +
    `<div class="refchart-wrap"><table class="refchart"><thead>${thead}</thead><tbody>${rows}</tbody></table></div>`;
}

// Requirement-first finder: given a load and a required offset (metres), return the beams that can
// rig the lift, each reported at its smallest qualifying-offset lug. A lug qualifies only if the
// offset is met AND the load is within capacity AND a counterweight position balances it AND the
// recommended rig keeps the rear sling < 60 deg and the beam tilt < 15 deg. All beams are judged in
// the counterweight-balancing (moment) sense; capacity ceiling is WLL for GTC, the certified cell
// for Maxirig. Sorted smallest-suitable-first (ascending WLL, rear-angle tie-break). Pure, no DOM.
function findSuitableBeams(beams, loadKg, offsetM) {
  if (!(loadKg > 0) || !(offsetM > 0)) return [];
  const REAR_MAX = 60, TILT_MAX = 15;
  const out = [];
  for (const beam of beams) {
    // qualifying lugs, smallest offset first
    const lugs = beam.offset_lugs.filter(l => l.offset_m >= offsetM).sort((a, b) => a.offset_m - b.offset_m);
    for (const lug of lugs) {
      const bal = balanceBallast(beam, lug.id, loadKg, 0);
      if (!bal.supported) continue;                       // counterweight can't balance the load here
      // finder judges the base, no-wing configuration (wings are operator opt-in, MR11462 only), so the rating stays self-consistent
      const cap = capacityCheck(beam, lug.id, bal.hole, loadKg, false);
      if (!cap.ok) continue;                              // over WLL / over certified cell / not rated
      // recommended rig: head at the 8 m soft cap clamped into the rear-angle window, beam levelled
      const rig = resolveRig(beam);
      const run = beam.back_lug_x_mm - lug.x_mm;
      if (!(run > 0)) continue;
      const rr = rig.rear_sling_deg, capLen = rig.max_sling_len_mm || 8000;
      const hMin = run * Math.tan(rr.min * Math.PI / 180), hMax = run * Math.tan(rr.max * Math.PI / 180);
      const headMm = Math.max(hMin, Math.min(capLen, hMax));
      const cb = rig.chain_block_mm;
      const su0 = suspensionGeometry(beam, lug.id, bal.holeIndex, loadKg, headMm, headMm, 0);
      const lrLevel = su0.LrLevel;                        // rear-leg length that levels the beam
      const fixedTail = Math.max(0, lrLevel - 6000);
      const chainBlock = Math.max(cb.min, Math.min(cb.max, lrLevel - fixedTail));
      const su = suspensionGeometry(beam, lug.id, bal.holeIndex, loadKg, headMm, fixedTail + chainBlock, 0);
      if (!su.valid) continue;                            // legs can't close a triangle
      if (su.rearAngleDeg >= REAR_MAX) continue;          // rear sling must be < 60 deg
      if (Math.abs(su.tiltDeg) >= TILT_MAX) continue;     // beam must sit within 15 deg of level
      const fr = rig.front_sling_deg;
      if (su.frontAngleDeg < fr.min - 0.5 || su.frontAngleDeg > fr.max + 0.5) continue;  // front sling must sit in the app's acceptance window (else it opens NOT OK)
      out.push({
        beam, lugId: lug.id, offsetM: lug.offset_m,
        capacityKg: beam.maker === 'Maxirig' ? cap.governingKg : cap.wllKg,
        holeIndex: bal.holeIndex, hole: bal.hole,
        rearAngleDeg: su.rearAngleDeg, tiltDeg: su.tiltDeg, wll_t: beam.wll_t
      });
      break;                                              // report the smallest suitable lug only
    }
  }
  out.sort((a, b) => a.wll_t - b.wll_t || a.rearAngleDeg - b.rearAngleDeg);
  return out;
}

if (typeof module !== 'undefined') module.exports = { lugById, lugLabel, balanceBallast, positionAllowed, chartFor, capacityCheck, slingGeometry, balancingLoad, evaluateHole, selectConfig, combinedCogX, suspensionGeometry, slingTensions, chartGuide, maxWllAtLug, fixedSlingGeometry, chartTableHtml, resolveRig, findSuitableBeams };
