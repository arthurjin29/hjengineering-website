/**
 * Sling Length Calculator — Double Spreader (Cascading) Configuration
 *
 * Same as parallel, but the hook is replaced by a master spreader beam.
 * Each master beam end acts as the "hook" for a slave beam pair.
 * Slave beam ends sit on the direct sling paths from LP to master beam end,
 * using the same computeBeamEndPair logic as the parallel config.
 *
 *   Top:     2 slings (hook -> master beam ends)
 *   Middle:  4 slings (slave beam ends -> master beam ends)
 *   Bottom:  4 slings (LPs -> slave beam ends)
 *   Total:   10 slings, 3 beams
 */

import type { SharedInputs, ConfigInputs, CalcResult, Point3D, Sling } from './types';
import {
	degToRad, round4, horizontalDist, dist3D, midpoint, pointInPolygon2D,
	buildSling, computeVerticalLoad, autoPairLPs,
	computeSupportReactions, fixedBeamEnds, solveHangingBeam,
	solveCascadeMainBeam, applyLoadSharingFactor
} from './calc-core';

const TOP_ANGLE_WARN_DEG = 30;

export function calculate(shared: SharedInputs, config: ConfigInputs): CalcResult {
	const { liftingPoints, cog, minAngleDeg, totalLoad } = shared;
	const { masterLength, slaveLengthA, slaveLengthB, bottomSlingLen } = config;
	const minAngleRad = degToRad(minAngleDeg);
	// Optional per-lay target angles (governing minimum). Blank -> global min-angle.
	const middleAngleRad = config.middleAngleDeg != null ? Math.max(minAngleRad, degToRad(config.middleAngleDeg)) : minAngleRad;
	const topAngleRad = config.topAngleDeg != null ? Math.max(minAngleRad, degToRad(config.topAngleDeg)) : minAngleRad;
	const minSlingLen = bottomSlingLen ?? 2;

	// 1. LP pairing
	let groupAIdxs: number[], groupBIdxs: number[];
	if (config.pairing) {
		groupAIdxs = config.pairing.groupA.map(v => v - 1);
		groupBIdxs = config.pairing.groupB.map(v => v - 1);
	} else {
		const [a, b] = autoPairLPs(liftingPoints);
		groupAIdxs = a;
		groupBIdxs = b;
	}
	const groupALPs = groupAIdxs.map(i => liftingPoints[i]);
	const groupBLPs = groupBIdxs.map(i => liftingPoints[i]);
	const groupALabels = groupAIdxs.map(i => 'LP' + (i + 1));
	const groupBLabels = groupBIdxs.map(i => 'LP' + (i + 1));

	// 2. Pick points — each beam picked over the COG of the load it carries.
	//    Per-LP vertical share from a min-norm rigid-body reaction solve; the
	//    reaction-weighted centroid of the LPs equals the COG, so each side's
	//    sub-COG and the total COG nest consistently and the two top slings
	//    straddle the hook with cancelling horizontal thrust — no lean.
	const hookXY: Point3D = { x: cog.x, y: cog.y, z: 0 };

	const reactions = computeSupportReactions(liftingPoints, cog, totalLoad);
	let subCogFallback = false;
	const subCogOf = (idxs: number[]): { x: number; y: number } => {
		// A negative min-norm reaction means that LP would have to pull DOWN (COG
		// outside the support kern). Clamp negatives to zero and renormalise so the
		// sub-COG stays load-aware, and flag the state as unreliable. Float-noise at
		// the exact kern boundary (>= -1e-9) does not raise the flag.
		let anyNeg = false;
		for (const i of idxs) { if (reactions[i] < -1e-9) anyNeg = true; }
		if (anyNeg) subCogFallback = true;
		let w = 0, sx = 0, sy = 0;
		for (const i of idxs) {
			const r = Math.max(0, reactions[i]);
			w += r; sx += r * liftingPoints[i].x; sy += r * liftingPoints[i].y;
		}
		if (w < 1e-9) {
			subCogFallback = true;
			const mid = midpoint(liftingPoints[idxs[0]], liftingPoints[idxs[1]]);
			return { x: mid.x, y: mid.y };
		}
		return { x: sx / w, y: sy / w };
	};
	const subCogA = subCogOf(groupAIdxs);
	const subCogB = subCogOf(groupBIdxs);

	// 3. Vertical load shares per LP (clamped — same basis as subCogOf)
	const wA0 = Math.max(0, reactions[groupAIdxs[0]]);
	const wA1 = Math.max(0, reactions[groupAIdxs[1]]);
	const wB0 = Math.max(0, reactions[groupBIdxs[0]]);
	const wB1 = Math.max(0, reactions[groupBIdxs[1]]);
	const WA = wA0 + wA1, WB = wB0 + wB1;

	// 4. Coupled free-hang solve — every beam is a FIXED physical bar. Each 2nd-Lvl
	//    beam hangs from its Main pick and supports its two LPs (solveHangingBeam);
	//    the Main beam hangs from the hook and supports the two sub-spreaders, each
	//    end carrying that sub's two middle slings (solveCascadeMainBeam), which also
	//    raises the Main beam so every middle sling meets the middle-lay angle floor.
	//    Heights cascade LP -> 2nd-Lvl -> Main -> hook, so iterate the whole z-stack.
	const seedH = Math.max(...liftingPoints.map(p => p.z)) + 1e4;
	const seedMain = fixedBeamEnds(subCogA, subCogB, WA, WB, cog, masterLength!);
	let pickA: Point3D = { x: seedMain.end0.x, y: seedMain.end0.y, z: seedH };
	let pickB: Point3D = { x: seedMain.end1.x, y: seedMain.end1.y, z: seedH };
	let hookZ = seedH + 1e4;

	let sA: { end0: Point3D; end1: Point3D; converged: boolean };
	let sB: { end0: Point3D; end1: Point3D; converged: boolean };
	let masterZ = seedH;
	let mainConv = true, subConvA = true, subConvB = true, stackConv = false;
	for (let outer = 0; outer < 40; outer++) {
		sA = solveHangingBeam(groupALPs[0], groupALPs[1], wA0, wA1, pickA, pickA.z, slaveLengthA!, minAngleRad, minSlingLen);
		sB = solveHangingBeam(groupBLPs[0], groupBLPs[1], wB0, wB1, pickB, pickB.z, slaveLengthB!, minAngleRad, minSlingLen);
		subConvA = sA.converged; subConvB = sB.converged;
		const mE = solveCascadeMainBeam(sA.end0, sA.end1, wA0, wA1, sB.end0, sB.end1, wB0, wB1, hookXY, hookZ, masterLength!, middleAngleRad);
		mainConv = mE.converged; masterZ = mE.z;
		const npA: Point3D = { x: mE.end0.x, y: mE.end0.y, z: masterZ };
		const npB: Point3D = { x: mE.end1.x, y: mE.end1.y, z: masterZ };
		const newHookZ = masterZ + Math.max(horizontalDist(npA, hookXY), horizontalDist(npB, hookXY)) * Math.tan(topAngleRad);
		const chg = Math.hypot(npA.x - pickA.x, npA.y - pickA.y) + Math.hypot(npB.x - pickB.x, npB.y - pickB.y)
			+ Math.abs(newHookZ - hookZ) + Math.abs(masterZ - pickA.z);
		pickA = npA; pickB = npB; hookZ = newHookZ;
		if (chg < 1e-5) { stackConv = true; break; }
	}
	const beamEquilibriumNotConverged = !mainConv || !subConvA || !subConvB || !stackConv;
	// Final 2nd-Lvl solve at the settled picks so the drawn sub ends match the picks.
	sA = solveHangingBeam(groupALPs[0], groupALPs[1], wA0, wA1, pickA, pickA.z, slaveLengthA!, minAngleRad, minSlingLen);
	sB = solveHangingBeam(groupBLPs[0], groupBLPs[1], wB0, wB1, pickB, pickB.z, slaveLengthB!, minAngleRad, minSlingLen);

	const hook: Point3D = { x: cog.x, y: cog.y, z: hookZ };
	const slaveA1: Point3D = { x: sA.end0.x, y: sA.end0.y, z: sA.end0.z };
	const slaveA2: Point3D = { x: sA.end1.x, y: sA.end1.y, z: sA.end1.z };
	const slaveB1: Point3D = { x: sB.end0.x, y: sB.end0.y, z: sB.end0.z };
	const slaveB2: Point3D = { x: sB.end1.x, y: sB.end1.y, z: sB.end1.z };
	const masterPicks = { pickA, pickB };

	// Main Beam ends ARE the pick points — the full physical masterLength, no overhang.
	const physicalLength = masterLength!;
	const mainBeamEndA: Point3D = { ...pickA };
	const mainBeamEndB: Point3D = { ...pickB };

	// Actual (built) slave beam lengths — fixed to the entered lengths.
	const actualSlaveLenA = round4(dist3D(slaveA1, slaveA2));
	const actualSlaveLenB = round4(dist3D(slaveB1, slaveB2));

	// 5. COG polygon validation
	const cogOutsidePolygon = !pointInPolygon2D(cog, liftingPoints);

	// 6. Bottom slings (4): LP -> slave beam end
	let slingId = 1;
	const bottomSlings: Sling[] = [];
	bottomSlings.push(buildSling(slingId++,
		{ ...groupALPs[0], label: groupALabels[0] },
		{ ...slaveA1!, label: '2nd A End 1' }
	));
	bottomSlings.push(buildSling(slingId++,
		{ ...groupALPs[1], label: groupALabels[1] },
		{ ...slaveA2!, label: '2nd A End 2' }
	));
	bottomSlings.push(buildSling(slingId++,
		{ ...groupBLPs[0], label: groupBLabels[0] },
		{ ...slaveB1!, label: '2nd B End 1' }
	));
	bottomSlings.push(buildSling(slingId++,
		{ ...groupBLPs[1], label: groupBLabels[1] },
		{ ...slaveB2!, label: '2nd B End 2' }
	));

	// 7. Middle slings (4): slave beam ends -> master beam picks
	const middleSlings: Sling[] = [];
	middleSlings.push(buildSling(slingId++,
		{ ...slaveA1, label: '2nd A End 1' },
		{ ...masterPicks.pickA, label: 'Main Pick A' }
	));
	middleSlings.push(buildSling(slingId++,
		{ ...slaveA2, label: '2nd A End 2' },
		{ ...masterPicks.pickA, label: 'Main Pick A' }
	));
	middleSlings.push(buildSling(slingId++,
		{ ...slaveB1, label: '2nd B End 1' },
		{ ...masterPicks.pickB, label: 'Main Pick B' }
	));
	middleSlings.push(buildSling(slingId++,
		{ ...slaveB2, label: '2nd B End 2' },
		{ ...masterPicks.pickB, label: 'Main Pick B' }
	));

	// 8. Top slings (2): master beam picks -> hook
	const topSlings: Sling[] = [];
	const topSlingA = buildSling(slingId++,
		{ ...masterPicks.pickA, label: 'Main Pick A' },
		{ ...hook, label: 'Hook' }
	);
	topSlings.push(topSlingA);
	const topSlingB = buildSling(slingId++,
		{ ...masterPicks.pickB, label: 'Main Pick B' },
		{ ...hook, label: 'Hook' }
	);
	topSlings.push(topSlingB);

	// 9. Tensions — each sling carries its own load's vertical component, matching the
	//    free-hang solve (per-end loads, not a moment split). A top sling holds its
	//    side's full sub-assembly (WA / WB); a middle/bottom sling holds its own LP load.
	const endW = [wA0, wA1, wB0, wB1];
	const slingTension = (w: number, a: Point3D, b: Point3D) => {
		const len = dist3D(a, b);
		const vd = Math.abs(b.z - a.z);
		return round4((len < 1e-4 || vd < 1e-4) ? w : w * len / vd);
	};
	topSlingA.tension = slingTension(WA, masterPicks.pickA, hook);
	topSlingB.tension = slingTension(WB, masterPicks.pickB, hook);
	for (let i = 0; i < 4; i++) {
		middleSlings[i].tension = slingTension(endW[i], middleSlings[i].from, middleSlings[i].to);
		bottomSlings[i].tension = slingTension(endW[i], bottomSlings[i].from, bottomSlings[i].to);
	}

	// 10. Vertical loads
	const allSlings = [...bottomSlings, ...middleSlings, ...topSlings];
	for (const s of allSlings) {
		s.verticalLoad = round4(computeVerticalLoad(s.tension, s.from, s.to));
	}

	// 11. Warnings
	const topSlingAngleLow =
		topSlings.some(s => s.angleDegFromHoriz < TOP_ANGLE_WARN_DEG) ||
		middleSlings.some(s => s.angleDegFromHoriz < TOP_ANGLE_WARN_DEG);
	const negativeTension = allSlings.some(s => s.tension < 0);
	const nearHorizontalBottom = bottomSlings.some(s => s.angleDegFromHoriz < 5);
	const bottomSlingBelowMin = minSlingLen > 0 && bottomSlings.some(s => s.length < minSlingLen - 0.01);

	// 12. Critical sling
	let criticalTier = 'bottom';
	let criticalIdx = 0;
	let maxTension = -Infinity;
	bottomSlings.forEach((s, i) => {
		if (s.tension > maxTension) { maxTension = s.tension; criticalTier = 'bottom'; criticalIdx = i; }
	});
	middleSlings.forEach((s, i) => {
		if (s.tension > maxTension) { maxTension = s.tension; criticalTier = 'middle'; criticalIdx = i; }
	});
	topSlings.forEach((s, i) => {
		if (s.tension > maxTension) { maxTension = s.tension; criticalTier = 'top'; criticalIdx = i; }
	});
	const tierMap: Record<string, Sling[]> = { bottom: bottomSlings, middle: middleSlings, top: topSlings };
	tierMap[criticalTier][criticalIdx].isCritical = true;

	// 13. Result
	const maxLPz = Math.max(...liftingPoints.map(p => p.z));

	const loadSharingAnalysis = applyLoadSharingFactor(
		bottomSlings.map(s => s.tension),
		'double-cascade',
		shared.toleranceMode
	);

	return {
		configType: 'double-cascade',
		hook: { x: round4(hook.x), y: round4(hook.y), z: round4(hook.z) },
		hookHeight: round4(hook.z),
		headroom: round4(hook.z - maxLPz),
		heightAboveCOG: round4(hook.z - cog.z),
		totalLoad,
		minAngleDeg,
		criticalSling: { tier: criticalTier, id: criticalIdx + 1 },
		tiers: [
			{ name: 'Bottom Slings', slings: bottomSlings },
			{ name: 'Middle Slings', slings: middleSlings },
			{ name: 'Top Slings', slings: topSlings }
		],
		loadSharingAnalysis,
		beams: [
			{
				name: 'Main Beam',
				endA: { x: round4(mainBeamEndA.x), y: round4(mainBeamEndA.y), z: round4(mainBeamEndA.z) },
				endB: { x: round4(mainBeamEndB.x), y: round4(mainBeamEndB.y), z: round4(mainBeamEndB.z) },
				length: round4(physicalLength), pickupPoint: null
			},
			{
				name: '2nd Lvl Beam A',
				endA: { x: round4(slaveA1.x), y: round4(slaveA1.y), z: round4(slaveA1.z) },
				endB: { x: round4(slaveA2.x), y: round4(slaveA2.y), z: round4(slaveA2.z) },
				length: actualSlaveLenA, pickupPoint: null
			},
			{
				name: '2nd Lvl Beam B',
				endA: { x: round4(slaveB1.x), y: round4(slaveB1.y), z: round4(slaveB1.z) },
				endB: { x: round4(slaveB2.x), y: round4(slaveB2.y), z: round4(slaveB2.z) },
				length: actualSlaveLenB, pickupPoint: null
			}
		],
		intermediatePoints: [
			{ ...slaveA1, label: '2nd A End 1' }, { ...slaveA2, label: '2nd A End 2' },
			{ ...slaveB1, label: '2nd B End 1' }, { ...slaveB2, label: '2nd B End 2' },
			{ x: round4(masterPicks.pickA.x), y: round4(masterPicks.pickA.y), z: round4(masterPicks.pickA.z), label: 'Main Pick A' },
			{ x: round4(masterPicks.pickB.x), y: round4(masterPicks.pickB.y), z: round4(masterPicks.pickB.z), label: 'Main Pick B' }
		],
		slackLegAnalysis: {
			applicable: false,
			toleranceMm: shared.toleranceMm != null ? shared.toleranceMm : 200,
			reason: 'Tolerance check requires geometric perturbation analysis for paired sling configurations (not yet implemented).'
		},
		warnings: {
			cogOutsidePolygon,
			negativeTension,
			topSlingAngleLow,
			nearHorizontalBottom,
			bottomSlingBelowMin,
			beamEquilibriumNotConverged,
			subCogFallback,
			liftBeamBendingNotChecked: false,
			spreaderBeamCapacityNotChecked: true
		}
	};
}
