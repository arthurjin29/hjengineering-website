let BEAMS = [];
const $ = id => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const state = { beam: null, lugId: 1, loadKg: 10000, headMm: 3000, holeIndex: null, chainBlockMm: 3000, fixedTailMm: 0, detached: false, wing: false, rigMode: 'fixed', rig: null, frame: null };

// Structural beam mass: Maxirig self_weight_kg bundles the counterweight, so use beam_only_kg.
function structMass(beam) { return beam.maker === 'Maxirig' ? beam.beam_only_kg : beam.self_weight_kg; }
// Wing weights bolt ON TO the counterweight (op guide p10), so they are part of the MOVABLE mass and
// ride with the pin — and the amended, stricter chart governs while they are fitted. MR11462 only.
function wingKg(beam) {
  const b = beam || state.beam || currentBeam();
  const w = b && b.alt_charts && b.alt_charts.wing_weights;
  return (state.wing && w) ? (w.added_mass_kg || 0) : 0;
}
function hasWingOption(b) { return !!(b && b.alt_charts && b.alt_charts.wing_weights); }

fetch('data/beams.json').then(r => r.json()).then(data => {
  BEAMS = data;
  const gtc = data.filter(b => b.maker !== 'Maxirig'), mr = data.filter(b => b.maker === 'Maxirig');
  const opt = b => `<option value="${b.id}">${b.maker === 'Maxirig' ? b.id + ' — ' + b.name : b.id + ' (WLL ' + b.wll_t + ' T)'}</option>`;
  $('beam').innerHTML =
    `<optgroup label="GTC">${gtc.map(opt).join('')}</optgroup>` +
    (mr.length ? `<optgroup label="Maxirig">${mr.map(opt).join('')}</optgroup>` : '');
  renderLugs();
  refreshChart();
});

function currentBeam() { return BEAMS.find(b => b.id === $('beam').value); }

// Reference load-chart panel: rebuild the table for the dropdown beam. opts carries the post-calc
// highlight (selected lug column + recommended position row); omit for a plain, un-highlighted view.
function refreshChart(opts) {
  const b = currentBeam(), body = $('chartbody');
  if (!b || !body) return;
  const o = opts || {};
  if (o.useWing == null) o.useWing = !!(hasWingOption(b) && $('wing') && $('wing').checked);
  body.innerHTML = window.chartTableHtml(b, o);
}
function isMaxirig() { const b = currentBeam(); return !!(b && b.maker === 'Maxirig'); }
function lugObj() { return state.beam.offset_lugs.find(l => l.id === state.lugId); }
function lugRun() { return state.beam.back_lug_x_mm - lugObj().x_mm; }

function renderLugs() {
  const b = currentBeam(); if (!b) return;
  $('lugs').innerHTML = b.offset_lugs.map((l, i) =>
    `<label><input type="radio" name="lug" value="${l.id}" ${i === 0 ? 'checked' : ''}/> ${window.lugLabel(b, l.id)} (${l.offset_m} m)</label>`).join(' ');
  $('rigmode').hidden = !(b.maker === 'Maxirig');   // rigging-mode toggle is Maxirig-only
  defaultLoadToLug();   // start at the lug's max usable load
}
// Beam change: reset transient state + panels so a GTC/Maxirig switch never shows stale controls.
function onBeamChange() {
  state.wing = false; if ($('wing')) $('wing').checked = false;
  state.rigMode = 'fixed';
  const fx = document.querySelector('input[name=rigmode][value=fixed]'); if (fx) fx.checked = true;
  resetPanels();
  renderLugs();
  refreshChart();
}
$('beam').addEventListener('change', onBeamChange);

// Rigging-mode toggle (Maxirig only): switch the certified fixed-sling set vs a GTC-style chain-block
// rig. Clear the panels/diagram and re-default the load band (chain-block is C/W-balance-limited).
document.querySelectorAll('input[name=rigmode]').forEach(r => r.addEventListener('change', () => {
  state.rigMode = document.querySelector('input[name=rigmode]:checked').value;
  resetPanels();
  defaultLoadToLug();
  refreshChart();   // resetPanels clears the wing tick, so redraw the chart it no longer matches
}));

function resetPanels() {
  state.frame = null;   // drop any frozen view frame from a previous calculation
  $('controls').hidden = true;
  $('fixedrig').hidden = true;
  // Hiding the wing toggle must also clear it. Wings ARE modelled on both paths now, but the tick
  // must not survive a mode switch unseen: it changes the governing chart and 1.5 t of ballast, so
  // it defaults OFF and the operator re-confirms what is physically bolted on.
  $('wingtoggle').hidden = true;
  state.wing = false; if ($('wing')) $('wing').checked = false;
  $('result').innerHTML = ''; $('result').className = '';
  $('diagram').innerHTML = '';
  sizeDiagramColumn(null);   // drop the inline track so an empty column does not keep the old width
  if ($('beamflags')) { $('beamflags').innerHTML = ''; $('beamflags').hidden = true; }
}

// Maxirig: the lug's max certified capacity across all rated chart positions (WLL-capped).
function lugMaxChart(b, lugId, useWing) {
  const chart = (useWing && b.alt_charts) ? b.alt_charts.wing_weights.capacity_kg : b.capacity_kg;
  const col = chart[String(lugId)] || {}; let m = 0;
  b.ballast.holes.forEach(h => { const c = col[h]; if (c != null) m = Math.max(m, Math.min(c, b.wll_t * 1000)); });
  return m;
}

// Set the load field's valid range to the lug's usable band and default to its max.
// The user is free to enter any value within the range (1 .. max usable).
function defaultLoadToLug() {
  const b = currentBeam(); if (!b) return;
  const checked = document.querySelector('input[name=lug]:checked');
  const lugId = checked ? Number(checked.value) : b.offset_lugs[0].id;
  // Fixed mode: chart max. Chain-block mode: min(chart max, most the C/W can moment-balance) so the
  // default load is both chart-rated and balanceable. GTC: most the C/W can balance (capped at WLL).
  const maxL = b.maker === 'Maxirig'
    ? (state.rigMode === 'chainblock'
        ? Math.round(Math.min(lugMaxChart(b, lugId, state.wing), window.maxWllAtLug(b, lugId, wingKg(b))))
        : Math.round(lugMaxChart(b, lugId, state.wing)))
    : Math.round(window.maxWllAtLug(b, lugId, wingKg(b)));
  const el = $('load');
  el.min = 1; el.max = maxL;     // any value in [1, maxL] is acceptable
  el.value = maxL;               // sensible default (editable)
}
window.addEventListener('resize', () => { if ($('diagram').querySelector('svg')) sizeDiagramColumnFromSvg(); });
$('lugs').addEventListener('change', defaultLoadToLug);   // re-default when the lug changes

function levelLrForHole(holeIndex) {
  const R = lugRun();
  const effLoad = state.detached ? 0 : state.loadKg;   // level the EMPTY beam when the load is detached
  const c = window.combinedCogX(state.beam, state.lugId, effLoad, holeIndex, wingKg()) - lugObj().x_mm;
  return Math.sqrt(Math.max(0, state.headMm * state.headMm + R * R - 2 * R * c));
}

function calc() {
  state.beam = currentBeam();
  state.frame = null;   // fresh Calculate recomputes the view frame (drag/sliders reuse it thereafter)
  state.rig = resolveRig(state.beam);   // GTC rigging, or a derived one for Maxirig chain-block mode
  state.lugId = Number(document.querySelector('input[name=lug]:checked').value);
  state.loadKg = Number($('load').value);
  if (!(state.loadKg > 0)) { rejectLoad(); return; }   // reject blank / zero / negative load
  // head height (top sling) defaults to the 8 m soft cap, kept within the rear-angle range
  const rr0 = state.rig.rear_sling_deg, capLen = state.rig.max_sling_len_mm || 8000;
  const hMin = lugRun() * Math.tan(rr0.min * Math.PI / 180), hMax = lugRun() * Math.tan(rr0.max * Math.PI / 180);
  state.headMm = clamp(capLen, hMin, hMax);
  state.holeIndex = window.balanceBallast(state.beam, state.lugId, state.loadKg, wingKg()).holeIndex;
  const cb = state.rig.chain_block_mm;
  const lrLevel = levelLrForHole(state.holeIndex);
  // size the fixed steel tail so the chain block opens at ~6 m and the beam still starts level
  state.fixedTailMm = Math.max(0, lrLevel - 6000);
  state.chainBlockMm = clamp(lrLevel - state.fixedTailMm, cb.min, cb.max);
  $('cb').min = cb.min; $('cb').max = cb.max; $('cb').value = state.chainBlockMm;
  // top sling (front) length slider — range is the 30-60deg rear-angle window
  $('ts').min = Math.round(hMin); $('ts').max = Math.round(hMax); $('ts').value = Math.round(state.headMm);
  // rear chain (fixed green chain above the chain block) length slider
  $('rc').min = 500; $('rc').max = 12000; $('rc').value = Math.round(state.fixedTailMm);
  updateTsLabel(); updateRcLabel(); updateCbLabel();
  $('fixedrig').hidden = true;
  $('wingtoggle').hidden = !hasWingOption(state.beam);   // wings are valid with the chain block too
  $('controls').hidden = false;
  render();
  refreshChart({ selLugId: state.lugId, recHole: state.beam.ballast.holes[state.holeIndex], useWing: wingKg() > 0 });
}
// Maxirig fixed-sling mode → certified-chart calc; GTC and Maxirig chain-block → moment-calc path.
$('f').addEventListener('submit', e => {
  e.preventDefault();
  (isMaxirig() && state.rigMode !== 'chainblock') ? calcMaxirig() : calc();
});

// ---- Maxirig: fixed-sling rigging, certified-chart capacity ----
// Pick the rated counterweight position with the LEAST certified capacity that still carries the
// load — matches "move the C/W forward for lighter loads" on monotonic charts and stays
// conservative on non-monotonic ones (e.g. MR10579 lug 3).
function maxirigPick(b, lugId, loadKg, useWing) {
  const chart = (useWing && b.alt_charts) ? b.alt_charts.wing_weights.capacity_kg : b.capacity_kg;
  const wllKg = b.wll_t * 1000;
  const col = chart[String(lugId)] || {};
  let pick = null, maxGovKg = 0;
  b.ballast.holes.forEach((letter, i) => {
    const cap = col[letter]; if (cap == null) return;
    const gov = Math.min(cap, wllKg);
    maxGovKg = Math.max(maxGovKg, gov);
    if (gov >= loadKg && (pick === null || gov < pick.govKg)) {
      const holeXMm = b.ballast.holes_x_mm ? b.ballast.holes_x_mm[i] : b.ballast.first_hole_x_mm + b.ballast.pitch_mm * i;
      const lugX = b.offset_lugs.find(l => l.id === lugId).x_mm;
      pick = { hole: letter, holeIndex: i, holeXMm, distFromLugMm: holeXMm - lugX, cellKg: cap, govKg: gov };
    }
  });
  return { pick, maxGovKg, liftable: !!pick };
}

function calcMaxirig() {
  state.beam = currentBeam();
  state.lugId = Number(document.querySelector('input[name=lug]:checked').value);
  state.loadKg = Number($('load').value);
  $('controls').hidden = true;
  $('fixedrig').hidden = false;
  $('wingtoggle').hidden = !hasWingOption(state.beam);
  if (!(state.loadKg > 0)) { rejectLoad(); return; }
  renderMaxirig();
}

function renderMaxirig() {
  const b = state.beam, lugId = state.lugId, load = state.loadKg;
  const useWing = hasWingOption(b) && state.wing;
  const g = window.fixedSlingGeometry(b, lugId);
  const res = maxirigPick(b, lugId, load, useWing);
  const view = { maker: 'Maxirig', lugId, loadKg: load, g, pick: res.pick || {}, useWing, ok: res.liftable };
  updateMaxirigPanel(b, lugId, load, g, res, useWing);
  renderBeamFlags();
  $('diagram').innerHTML = window.renderDiagram(b, view);
  sizeDiagramColumnFromSvg();   // fixed-sling path has no frozen frame — take the aspect from the SVG
  refreshChart({ selLugId: lugId, recHole: res.pick ? res.pick.hole : null, useWing });
}

function updateMaxirigPanel(b, lugId, load, g, res, useWing) {
  const panel = $('result');
  const ok = res.liftable;
  panel.className = ok ? 'ok' : 'fail';
  const sl = b.rigging.sling_lengths.find(s => s.lug === lugId) || {};
  const c = b.cert || {};
  const wllKg = b.wll_t * 1000;
  const pick = res.pick;
  const msgs = [];
  if (!ok) msgs.push(`Load ${load.toLocaleString()} kg exceeds the certified capacity at lug ${lugId} (max ${res.maxGovKg.toLocaleString()} kg${useWing ? ', wing-weights chart' : ''}). Try a lower lug or move the load closer.`);
  if (sl.conflict) msgs.push(`Lug ${lugId} rear sling length is UNRESOLVED: ${sl.conflict}`);
  if (useWing) msgs.push('Wing-weights chart in use (2×750 kg wings fitted). Standard chart does not apply.');
  const util = ok ? (load / pick.govKg * 100).toFixed(0) + '%' : '—';
  panel.innerHTML =
    `<strong>${ok ? 'OK' : 'NOT OK'}</strong> &nbsp; ` +
    (ok ? `Counterweight position <strong>${pick.hole}</strong> — ${(pick.distFromLugMm/1000).toFixed(2)} m from lug ${lugId}` : 'No rated counterweight position carries this load') +
    `<br/>Certified capacity (lug ${lugId}${useWing ? ', wing weights' : ''}): cell <strong>${ok ? pick.cellKg.toLocaleString() + ' kg' : '—'}</strong> · lug max ${res.maxGovKg.toLocaleString()} kg · WLL ${b.wll_t} t${ok && pick.cellKg > wllKg ? ' (capped at WLL)' : ''} · util ${util}` +
    `<br/>Fixed slings — front ${sl.front_mm ? (sl.front_mm/1000).toFixed(2) + ' m @ ' + (g.valid ? g.frontDeg.toFixed(0) + '°' : '—') : '—'} &nbsp; rear ${sl.rear_mm ? (sl.rear_mm/1000).toFixed(2) + ' m @ ' + (g.valid ? g.rearDeg.toFixed(0) + '°' : '—') : '—'} &nbsp; hook ${g.valid ? Math.round(g.hookOffsetMm) + ' mm rear of lug' : '—'}` +
    `<br/><span class="muted">Certified to ${c.standard || 'AS 4991-2004'} · proof cert ${c.proof_cert_no || '—'}${c.proof_date ? ' (' + c.proof_date + ')' : ''} · ${c.model_no || ''} · dwg ${c.drawing_no || '—'}</span>` +
    (msgs.length ? `<div class="muted">${msgs.join('<br/>')}</div>` : '');
}
$('wing').addEventListener('change', () => {
  state.wing = $('wing').checked;
  const b = currentBeam();                                  // live dropdown beam — state.beam only updates on calc
  if (!hasWingOption(b)) return;                            // only the wing-weights beam has the option
  defaultLoadToLug();      // capacities changed -> re-default the load range/value
  state.loadKg = Number($('load').value);
  // Live re-render once a calc has run, on whichever path is active; otherwise just swap the chart.
  if (state.beam && hasWingOption(state.beam)) {
    (state.rigMode === 'chainblock') ? calc() : renderMaxirig();
  } else refreshChart();
});

// Invalid (blank / zero / negative) load: prompt cleanly, hide the controls + diagram, and do
// NOT show a hole result — the earlier over-balance numbers were misleading for a non-positive load.
function rejectLoad() {
  $('controls').hidden = true;
  $('diagram').innerHTML = '';
  sizeDiagramColumn(null);   // no drawing -> release the inline diagram track
  if ($('beamflags')) { $('beamflags').innerHTML = ''; $('beamflags').hidden = true; }
  const panel = $('result');
  panel.className = 'fail';
  panel.innerHTML = '<strong>Enter a load greater than 0 kg.</strong>' +
    '<div class="muted">The load must be a positive weight to select a ballast position.</div>';
}

function updateCbLabel() { $('cbval').textContent = (state.chainBlockMm / 1000).toFixed(2) + ' m'; }
function updateTsLabel() { $('tsval').textContent = (state.headMm / 1000).toFixed(2) + ' m'; }
function updateRcLabel() { $('rcval').textContent = (state.fixedTailMm / 1000).toFixed(2) + ' m'; }

function chartGuideLine(ev) {
  const cg = window.chartGuide(state.beam, state.lugId, state.loadKg, wingKg() > 0);
  if (!cg) return '';
  const agree = cg.holeIndex === ev.holeIndex;
  const note = agree ? 'matches moment calc'
    : `chart pos ${cg.hole} vs moment-calc hole ${ev.hole} — moment calc governs`;
  const src = state.beam.maker === 'Maxirig'
    ? (wingKg() ? 'Wing-weights chart' : 'Certified chart') : 'GTC chart';
  return `<br/><span class="muted">${src} (guide): pos ${cg.hole} ≈ ${cg.cap} kg — ${note}</span>`;
}

function fmtTension(t) {
  if (!t || !t.valid) return 'rear leg cannot reach';
  const f = t.slackFront ? 'Front sling slack' : `Front sling ${t.frontKN.toFixed(0)} kN (${t.frontT.toFixed(1)} t)`;
  const r = t.slackRear ? 'rear leg slack' : `Rear leg ${t.rearKN.toFixed(0)} kN (${t.rearT.toFixed(1)} t)`;
  return `${f} &nbsp;·&nbsp; ${r}`;
}

$('cb').addEventListener('input', () => { state.chainBlockMm = Number($('cb').value); updateCbLabel(); render(); });
$('ts').addEventListener('input', () => { state.headMm = Number($('ts').value); updateTsLabel(); render(); });
$('rc').addEventListener('input', () => { state.fixedTailMm = Number($('rc').value); updateRcLabel(); render(); });
$('levelbtn').addEventListener('click', () => {
  const cb = state.rig.chain_block_mm;
  state.chainBlockMm = clamp(levelLrForHole(state.holeIndex) - state.fixedTailMm, cb.min, cb.max);
  $('cb').value = state.chainBlockMm; updateCbLabel(); render();
});
$('detach').addEventListener('change', () => { state.detached = $('detach').checked; render(); });

function acceptance(su, ev) {
  const fr = state.rig.front_sling_deg, rr = state.rig.rear_sling_deg;
  const frontOk = su.valid && su.frontAngleDeg >= fr.min - 0.5 && su.frontAngleDeg <= fr.max + 0.5;
  const rearOk = su.valid && su.rearAngleDeg >= rr.min - 0.5 && su.rearAngleDeg <= rr.max + 0.5;
  return { frontOk, rearOk, ok: ev.ok && su.valid && frontOk && rearOk, fr, rr };
}

// Union view frame over the attached state and the detached state at the chain block's current,
// minimum and maximum lengths (the detached swing envelope a drag can reach). Parses the frame the
// renderer embeds as data-minx/maxx/miny/maxy on probe SVG strings.
function computeUnionFrame(baseView) {
  const frames = [];
  const grab = svgStr => {
    const m = /data-minx="([-\d.]+)" data-maxx="([-\d.]+)" data-miny="([-\d.]+)" data-maxy="([-\d.]+)"/.exec(svgStr);
    if (m) frames.push({ minX: +m[1], maxX: +m[2], minY: +m[3], maxY: +m[4] });
  };
  const cbBand = state.rig.chain_block_mm || { min: 500, max: 6000 };
  const probes = [
    { detached: false, Lr: state.fixedTailMm + state.chainBlockMm },
    { detached: true,  Lr: state.fixedTailMm + state.chainBlockMm },
    { detached: true,  Lr: state.fixedTailMm + cbBand.min },
    { detached: true,  Lr: state.fixedTailMm + cbBand.max }
  ];
  for (const p of probes) {
    const suP = window.suspensionGeometry(state.beam, state.lugId, state.holeIndex, p.detached ? 0 : state.loadKg, state.headMm, p.Lr, wingKg());
    if (!suP) continue;
    grab(window.renderDiagram(state.beam, { ...baseView, su: suP, detached: p.detached, frame: null }));
  }
  if (!frames.length) return null;
  return {
    minX: Math.min(...frames.map(f => f.minX)), maxX: Math.max(...frames.map(f => f.maxX)),
    minY: Math.min(...frames.map(f => f.minY)), maxY: Math.max(...frames.map(f => f.maxY))
  };
}

// Narrow the diagram track to the drawing's own width so a tall/narrow beam hands its unused width
// back to the controls instead of leaving a gap beside the diagram. The width is DERIVED from the
// frozen frame's aspect and the height cap (not measured from the rendered element), so there is no
// layout feedback loop. Cleared below the responsive breakpoint, where the layout is single-column.
// The diagram column is `1fr` in CSS — it takes all width the left controls column leaves, so the
// tool fills the window. These stay as no-ops (call sites unchanged) to let the CSS grid govern;
// the SVG scales to the column width, capped by its viewport-height rule.
function sizeDiagramColumnFromSvg() { sizeDiagramColumn(); }
function sizeDiagramColumn() {
  const layout = document.querySelector('.layout');
  if (layout) layout.style.gridTemplateColumns = '';
}

function render() {
  const Lr = state.fixedTailMm + state.chainBlockMm;
  const suspLoad = state.detached ? 0 : state.loadKg;     // empty beam when the load is detached
  const su = window.suspensionGeometry(state.beam, state.lugId, state.holeIndex, suspLoad, state.headMm, Lr, wingKg());
  const ev = window.evaluateHole(state.beam, state.lugId, state.holeIndex, state.loadKg, null, wingKg());
  const acc = acceptance(su, ev);
  const totalKg = suspLoad + structMass(state.beam) + state.beam.ballast_kg + wingKg();
  const tension = window.slingTensions(su, totalKg);
  const view = {
    lugId: state.lugId, holeIndex: state.holeIndex, holeXMm: ev.holeXMm, hole: ev.hole,
    loadKg: state.loadKg, ok: state.detached ? false : acc.ok, su, chainBlockMm: state.chainBlockMm,
    topChainMm: state.fixedTailMm, tension, detached: state.detached,
    chainBlock: state.beam.maker === 'Maxirig', rig: state.rig, frame: state.frame, wingKg: wingKg()
  };
  if (state.detached) updateDetachedPanel(su, tension); else updatePanel(su, ev, acc, tension);
  renderBeamFlags();
  // First render after a Calculate (state.frame was null): freeze a frame covering BOTH the attached
  // state and the detached swing extremes, so toggling Load-detached or dragging the chain block never
  // clips or reframes. Probe renders are pure string calls (never shown).
  if (!state.frame) state.frame = computeUnionFrame(view);
  view.frame = state.frame;
  sizeDiagramColumn(view.frame);
  $('diagram').innerHTML = window.renderDiagram(state.beam, view);
  attachDrag();
}

// Persistent, beam-level provenance warnings (independent of the per-calc result panel).
// Only OLB-22 carries a signed AS 4991 certificate; every other beam's WLL is back-calculated
// from the GTC chart maximum and must be confirmed against the certificate before use.
function renderBeamFlags() {
  const b = state.beam, out = [];
  if (b.wll_source !== 'certified') {
    out.push(`WLL ${b.wll_t} T is inferred from the GTC chart maximum — confirm against the GTC certificate before use.`);
  }
  if (b.geometry_confidence === 'low') {
    out.push(`Geometry indicative — ${b.geometry_note || 'source drawing not to scale'} The diagram is approximate; verify lug offsets against the drawing.`);
  }
  // Maxirig: surface every safety-relevant extraction flag (sling conflicts, chart anomaly,
  // scale-recovered geometry) as amber warnings.
  if (b.maker === 'Maxirig') {
    (b.flags || []).forEach(f => out.push(f));
    if (state.rigMode === 'chainblock') {
      out.push('Chain-block rigging is not the Maxirig-documented sling set — capacities per certified chart; CPEng to verify rigging.');
      if (state.rig && state.rig.rearAssumed) out.push('Rear-leg angle window assumed 30–60° — not stated by Maxirig.');
      // Wings ARE modelled on this path (mass rides the C/W, amended chart governs). State which
      // case is active so the operator can check it against what is physically bolted on.
      if (hasWingOption(b)) {
        out.push(wingKg()
          ? 'Wing weights FITTED: ' + (wingKg() / 1000).toFixed(1) + ' t added to the counterweight and the amended (stricter) chart is enforced — confirm both wings are actually bolted on.'
          : 'Wing weights NOT fitted: base chart and bare counterweight. Tick “Wing weights fitted” if they are on the beam.');
      }
    }
  }
  const el = $('beamflags');
  // Compact, closed-by-default disclosure — present for a public tool without the loud amber banners.
  if (!out.length) { el.innerHTML = ''; el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<details class="beamnotes"><summary>&#9432; Beam notes (${out.length}) — provenance &amp; assumptions</summary>` +
    out.map(m => `<div class="note">${m}</div>`).join('') + `</details>`;
}

function updateDetachedPanel(su, tension) {
  const panel = $('result');
  panel.className = 'fail';
  const lugX = lugObj().x_mm;
  const cogX = window.combinedCogX(state.beam, state.lugId, 0, state.holeIndex, wingKg());
  const behind = ((cogX - lugX) / 1000).toFixed(2);
  const slack = su.valid && su.frontAngleDeg < state.rig.front_sling_deg.min;
  const swing = su.level ? 'stays level' : `swings ${Math.abs(su.tiltDeg).toFixed(0)}° ${su.tiltDeg < 0 ? 'rear-down' : 'rear-up'}`;
  const msgs = [`Empty-beam CoG jumps to ${(cogX/1000).toFixed(2)} m (${behind} m behind the offset lug).`];
  if (slack || !su.valid) msgs.push('Top sling goes slack — the rear leg / chain block carries the empty beam.');
  msgs.push('Release the load slowly; use the chain block to control the empty beam (GTC procedure).');
  panel.innerHTML =
    `<strong>LOAD DETACHED</strong> — beam ${swing}` +
    `<br/>CoG (beam + ${((state.beam.ballast_kg + wingKg()) / 1000).toFixed(2)} T ballast${wingKg() ? ' incl. wings' : ''}) at ${(cogX/1000).toFixed(2)} m &nbsp; ` +
    `Top sling ${su.valid ? su.frontAngleDeg.toFixed(0) + '°' : '—'} &nbsp; Rear leg ${su.valid ? su.rearAngleDeg.toFixed(0) + '°' : '—'}` +
    `<br/>Tension (static): ${fmtTension(tension)}` +
    `<div class="muted">${msgs.join('<br/>')}</div>`;
}

// Name the governing failure in the headline. A verdict sitting next to "Ballast hole" and
// "Capacity util" reads as a capacity problem, so a geometry veto (rear-leg angle) has to say so
// up front instead of only in the notes below. Order: most fundamental cause first.
function failReason(su, ev, acc) {
  switch (ev.capacity.reason) {
    case 'invalid_load': return 'enter a valid load';
    case 'not_rated':    return 'position struck out on the maker chart';
    case 'over_wll':     return 'load over beam WLL';
    case 'over_chart':   return 'load over certified chart capacity';
  }
  if (!ev.inRange) return 'counterweight under-balances the load';
  if (!su.valid) return 'rear leg cannot reach';
  if (!acc.rearOk) return 'rear leg angle out of range';
  if (!acc.frontOk) return 'top sling angle out of range';
  return 'see notes below';
}

function updatePanel(su, ev, acc, tension) {
  const { frontOk, rearOk, ok, fr, rr } = acc;
  const panel = $('result');
  panel.className = ok ? 'ok' : 'fail';
  const util = ev.capacity.utilisation != null ? (ev.capacity.utilisation * 100).toFixed(0) + '%' : '—';
  const rec = window.balanceBallast(state.beam, state.lugId, state.loadKg, wingKg());
  const tilt = su.level ? 'level' : `tilted ${Math.abs(su.tiltDeg).toFixed(1)}° (${su.tiltDeg < 0 ? 'rear down' : 'rear up'})`;
  const cb = state.rig.chain_block_mm;
  const levelCb = clamp(su.LrLevel - state.fixedTailMm, cb.min, cb.max);
  const msgs = ev.messages.slice();
  if (!su.valid) msgs.push('Rear leg cannot reach — adjust chain block / head height.');
  if (su.valid && !rearOk) msgs.push(`Rear leg ${su.rearAngleDeg.toFixed(0)}° exceeds the ${rr.max}° max — reduce the head height.`);
  // Chain block is MINOR adjustment: the counterweight is the primary balance.
  if (su.valid && !ev.inRange) {
    msgs.push(`Move the counterweight to hole ${rec.hole} to balance — the chain block is for minor levelling only, not gross balancing.`);
  } else if (su.valid && !su.level) {
    msgs.push(`Minor: set chain block to ${(levelCb / 1000).toFixed(2)} m to level (or press “Level the beam”).`);
  }
  if (su.valid && ev.inRange && !frontOk) msgs.push(`Top sling ${su.frontAngleDeg.toFixed(0)}° is outside the ${fr.min}–${fr.max}° range.`);
  // soft length cap (warn only) on the flexible elements: top sling + top chain
  const capLen = state.rig.max_sling_len_mm;
  if (capLen && su.valid && su.T > capLen + 1) msgs.push(`Soft cap: top sling ${(su.T/1000).toFixed(2)} m exceeds ${capLen/1000} m.`);
  if (capLen && state.fixedTailMm > capLen + 1) msgs.push(`Soft cap: top chain ${(state.fixedTailMm/1000).toFixed(2)} m exceeds ${capLen/1000} m.`);

  // Over-WLL is a beam-capacity stop, independent of ballast position — no hole can make it liftable,
  // so don't print a "recommended hole" / balance detail that reads as if one could. Show the verdict
  // and let the muted WLL message carry the reason.
  const overWll = ev.capacity.reason === 'over_wll';
  panel.innerHTML =
    `<strong>${ok ? 'OK' : 'NOT OK'}</strong>${ok ? '' : ` — ${failReason(su, ev, acc)}`}` +
    (overWll ? '' :
      ` &nbsp; Ballast hole: <strong>${ev.hole}</strong>` +
      (ev.holeIndex === rec.holeIndex ? ' <span class="muted">(recommended)</span>' : ` <span class="muted">(recommended: ${rec.hole})</span>`) +
      `<br/>Hole ${ev.hole} balances <strong>${ev.balancingLoadKg.toFixed(0)} kg</strong> &nbsp; Capacity util: ${util}` +
      `<br/>Beam: <strong>${tilt}</strong> &nbsp; Top sling ${su.valid ? su.frontAngleDeg.toFixed(0) + '°' : '—'} &nbsp; Rear leg ${su.valid ? su.rearAngleDeg.toFixed(0) + '°' : '—'} &nbsp; head ${(su.T/1000).toFixed(2)} m` +
      `<br/>Tension (static): ${fmtTension(tension)}` +
      `<br/>Counterweight ${((ev.holeXMm - lugObj().x_mm) / 1000).toFixed(2)} m from lug ${window.lugLabel(state.beam, state.lugId)}` +
      chartGuideLine(ev)) +
    (msgs.length ? `<div class="muted">${msgs.join('<br/>')}</div>` : '');
}

// Drag the counterweight: live re-render (beam tilts) via document-level listeners + incremental hole snap.
let drag = null;
function attachDrag() {
  const svg = $('diagram').querySelector('svg'); if (!svg) return;
  const cwt = svg.querySelector('#cwt'); if (!cwt) return;
  cwt.addEventListener('pointerdown', e => {
    const scale = parseFloat(svg.getAttribute('data-scale'));
    const rect = svg.getBoundingClientRect();
    const vbW = svg.viewBox.baseVal.width;
    drag = {
      startX: e.clientX, startHoleX: ballastHoleX(state.beam, state.holeIndex),
      // world-mm per screen-px — snap by ABSOLUTE pin position, not a single pitch. Beams with
      // unequally-spaced pins (e.g. OLB-1: −175/−80 mm) then track the real holes under the cursor.
      mmPerPx: 1 / (scale * (rect.width / vbW))
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    e.preventDefault();
  });

  // Drag the chain block up/down along the rear leg: adjusts its length (rear leg Lr) -> beam re-tilts.
  const cbk = svg.querySelector('#chainblk'); if (!cbk) return;
  cbk.addEventListener('pointerdown', e => {
    const scale = parseFloat(svg.getAttribute('data-scale'));
    const rect = svg.getBoundingClientRect();
    const vbW = svg.viewBox.baseVal.width;
    cbDrag = {
      startX: e.clientX, startY: e.clientY, startCb: state.chainBlockMm,
      ux: parseFloat(cbk.getAttribute('data-ux')), uy: parseFloat(cbk.getAttribute('data-uy')),
      mmPerPx: 1 / (scale * (rect.width / vbW))
    };
    document.addEventListener('pointermove', onCbMove);
    document.addEventListener('pointerup', onCbUp);
    e.preventDefault();
  });
}
function ballastHoleX(beam, i) {
  const b = beam.ballast;
  return b.holes_x_mm ? b.holes_x_mm[i] : b.first_hole_x_mm + b.pitch_mm * i;
}
function onMove(e) {
  if (!drag) return;
  const targetX = drag.startHoleX + (e.clientX - drag.startX) * drag.mmPerPx;
  // nearest pin by actual position (handles unequal spacing + either pitch sign)
  let best = state.holeIndex, bestD = Infinity;
  const n = state.beam.ballast.holes.length;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(ballastHoleX(state.beam, i) - targetX);
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best !== state.holeIndex) { state.holeIndex = best; render(); }
}
function onUp() { drag = null; document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); }

// Chain-block drag: project pointer travel onto the rear-leg direction (down-leg = lengthen).
let cbDrag = null;
function onCbMove(e) {
  if (!cbDrag) return;
  const along = (e.clientX - cbDrag.startX) * cbDrag.ux + (e.clientY - cbDrag.startY) * cbDrag.uy;
  const cb = state.rig.chain_block_mm;
  const v = clamp(cbDrag.startCb + along * cbDrag.mmPerPx, cb.min, cb.max);
  if (Math.abs(v - state.chainBlockMm) >= 1) { state.chainBlockMm = v; $('cb').value = v; updateCbLabel(); render(); }
}
function onCbUp() { cbDrag = null; document.removeEventListener('pointermove', onCbMove); document.removeEventListener('pointerup', onCbUp); }

// ---- Find a beam mode ----
function setMode(mode) {
  const find = mode === 'find';
  $('mode-find').classList.toggle('active', find);
  $('mode-pick').classList.toggle('active', !find);
  $('pick-pane').hidden = find;
  $('find-pane').hidden = !find;
  document.querySelector('.layout').classList.toggle('find-mode', find);
}
$('mode-pick').addEventListener('click', () => setMode('pick'));
$('mode-find').addEventListener('click', () => setMode('find'));

// Render the results table (or an empty-state message) for a load + required offset.
function runFind() {
  const loadKg = Number($('find-load').value), offsetM = Number($('find-offset').value);
  const el = $('findresults');
  if (!(loadKg > 0) || !(offsetM > 0)) {
    el.innerHTML = '<div class="result-empty">Enter a load and a required offset, both greater than 0.</div>';
    return;
  }
  const list = window.findSuitableBeams(BEAMS, loadKg, offsetM);
  if (!list.length) {
    el.innerHTML = `<div class="result-empty">No beam meets ${loadKg.toLocaleString()} kg at &ge; ${offsetM} m offset &mdash; try a larger offset or a lower load.</div>`;
    return;
  }
  const rows = list.map(r => `<tr class="findrow" data-beam="${r.beam.id}" data-lug="${r.lugId}" data-load="${loadKg}" tabindex="0">` +
    `<td>${r.beam.id}</td><td>${r.beam.maker || 'GTC'}</td>` +
    `<td>${r.offsetM.toFixed(2)}</td>` +
    `<td>${Math.round(r.capacityKg).toLocaleString()}</td>` +
    `<td>${r.hole}</td>` +
    `<td>${r.rearAngleDeg.toFixed(0)}&#176;</td></tr>`).join('');
  el.innerHTML = `<table class="findtable"><thead><tr>` +
    `<th>Beam</th><th>Maker</th><th>Lug offset (m)</th><th>Capacity (kg)</th><th>C/W hole</th><th>Rear angle</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`;
}
$('findform').addEventListener('submit', e => { e.preventDefault(); runFind(); });

// Load a chosen result into the Pick-a-beam view and Calculate. Set values in dependency order —
// beam change and lug change both re-default the load, so the load is set LAST, then submit.
function openFromFinder(beamId, lugId, loadKg) {
  setMode('pick');
  const sel = $('beam'); sel.value = beamId; sel.dispatchEvent(new Event('change'));   // onBeamChange resets
  const beam = currentBeam();
  if (beam && beam.maker === 'Maxirig') {   // finder judged Maxirig in chain-block sense — match it
    const cbRadio = document.querySelector('input[name=rigmode][value=chainblock]');
    if (cbRadio) { cbRadio.checked = true; cbRadio.dispatchEvent(new Event('change')); }
  }
  const lugRadio = document.querySelector(`input[name=lug][value="${lugId}"]`);
  if (lugRadio) { lugRadio.checked = true; lugRadio.dispatchEvent(new Event('change')); }
  $('load').value = loadKg;
  $('f').dispatchEvent(new Event('submit', { cancelable: true }));
}
$('findresults').addEventListener('click', e => {
  const tr = e.target.closest('tr.findrow'); if (!tr) return;
  openFromFinder(tr.dataset.beam, Number(tr.dataset.lug), Number(tr.dataset.load));
});
$('findresults').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const tr = e.target.closest('tr.findrow'); if (!tr) return;
  e.preventDefault();
  openFromFinder(tr.dataset.beam, Number(tr.dataset.lug), Number(tr.dataset.load));
});
