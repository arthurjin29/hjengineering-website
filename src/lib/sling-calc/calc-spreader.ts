/**
 * Sling Length Calculator — Spreader Beam Configuration
 *
 * Bottom tier: 4 slings from 4 LPs to 2 beam ends (auto-assigned by proximity)
 * Top tier:    2 slings from beam ends to hook
 */

import type { SharedInputs, ConfigInputs, CalcResult, Point3D } from './types';
import {
	degToRad, round4, horizontalDist, dist3D, pointInPolygon2D,
	getOrientationAxis, computeBeamEnds, computeBeamEndZ,
	buildSling, calcTwoSlingTension, calcLoadDistribution, computeVerticalLoad
} from './calc-core';

const TOP_ANGLE_WARN_DEG = 30;

export function calculate(shared: SharedInputs, config: ConfigInputs): CalcResult {
	const { liftingPoints, cog, minAngleDeg, totalLoad } = shared;
	const { beamLength, orientation } = config;
	const minAngleRad = degToRad(minAngleDeg);

	// 1. Beam centre = centroid of all 4 LPs
	const cx = liftingPoints.reduce((s, p) => s + p.x, 0) / 4;
	const cy = liftingPoints.reduce((s, p) => s + p.y, 0) / 4;
	const beamCentre: Point3D = { x: cx, y: cy, z: 0 };

	// 2. Beam orientation axis
	const axis = getOrientationAxis(liftingPoints, orientation!);

	// 3. Beam ends (XY, Z = 0 initially)
	let { endA, endB } = computeBeamEnds(beamCentre, beamLength!, axis);

	// 4. Auto-assign each LP to nearest beam end
	const groupA: { lp: Point3D; idx: number; label: string }[] = [];
	const groupB: { lp: Point3D; idx: number; label: string }[] = [];
	for (let i = 0; i < liftingPoints.length; i++) {
		const lp = liftingPoints[i];
		const dA = horizontalDist(lp, endA);
		const dB = horizontalDist(lp, endB);
		if (dA <= dB) {
			groupA.push({ lp, idx: i, label: 'LP' + (i + 1) });
		} else {
			groupB.push({ lp, idx: i, label: 'LP' + (i + 1) });
		}
	}

	// Ensure both groups have at least 1 LP (handle edge cases)
	if (groupA.length === 0 || groupB.length === 0) {
		const ranked = liftingPoints.map((lp, i) => ({
			lp, idx: i, label: 'LP' + (i + 1),
			dA: horizontalDist(lp, endA)
		})).sort((a, b) => a.dA - b.dA);
		groupA.length = 0;
		groupB.length = 0;
		ranked.slice(0, 2).forEach(r => groupA.push(r));
		ranked.slice(2).forEach(r => groupB.push(r));
	}

	// 5. Beam end Z from bottom sling min angle (per group)
	endA.z = computeBeamEndZ(groupA.map(g => g.lp), endA, minAngleRad);
	endB.z = computeBeamEndZ(groupB.map(g => g.lp), endB, minAngleRad);

	// 6. COG polygon validation
	const cogOutsidePolygon = !pointInPolygon2D(cog, liftingPoints);

	// 7. Hook position — in beam plane, projected along beam axis
	const cogToEndA = { x: cog.x - endA.x, y: cog.y - endA.y };
	const beamDir = { x: endB.x - endA.x, y: endB.y - endA.y };
	const beamLen2D = Math.sqrt(beamDir.x * beamDir.x + beamDir.y * beamDir.y);
	let hookX: number, hookY: number;
	if (beamLen2D > 0.0001) {
		const t = (cogToEndA.x * beamDir.x + cogToEndA.y * beamDir.y) / (beamLen2D * beamLen2D);
		hookX = endA.x + t * beamDir.x;
		hookY = endA.y + t * beamDir.y;
	} else {
		hookX = cog.x;
		hookY = cog.y;
	}
	const hook: Point3D = { x: hookX, y: hookY, z: 0 };
	const hDistAtoHook = horizontalDist(endA, hook);
	const hDistBtoHook = horizontalDist(endB, hook);
	hook.z = Math.max(
		endA.z + hDistAtoHook * Math.tan(minAngleRad),
		endB.z + hDistBtoHook * Math.tan(minAngleRad)
	);

	// 8. Bottom slings — each LP to its assigned beam end
	const bottomSlings = [];
	let slingId = 1;

	for (const g of groupA) {
		bottomSlings.push(buildSling(slingId++,
			{ x: g.lp.x, y: g.lp.y, z: g.lp.z, label: g.label },
			{ x: endA.x, y: endA.y, z: endA.z, label: 'Beam End A' }
		));
	}
	for (const g of groupB) {
		bottomSlings.push(buildSling(slingId++,
			{ x: g.lp.x, y: g.lp.y, z: g.lp.z, label: g.label },
			{ x: endB.x, y: endB.y, z: endB.z, label: 'Beam End B' }
		));
	}

	// 9. Top slings (2 total)
	const topSlingA = buildSling(slingId++,
		{ x: endA.x, y: endA.y, z: endA.z, label: 'Beam End A' },
		{ x: hook.x, y: hook.y, z: hook.z, label: 'Hook' }
	);
	const topSlingB = buildSling(slingId++,
		{ x: endB.x, y: endB.y, z: endB.z, label: 'Beam End B' },
		{ x: hook.x, y: hook.y, z: hook.z, label: 'Hook' }
	);
	const topSlings = [topSlingA, topSlingB];

	// 10. Tensions

	// Top sling tensions
	const [topTensionA, topTensionB] = calcTwoSlingTension(endA, endB, hook, totalLoad);
	topSlingA.tension = round4(topTensionA);
	topSlingB.tension = round4(topTensionB);

	// Vertical load at each beam end
	const vLoadA = computeVerticalLoad(topTensionA, endA, hook);
	const vLoadB = computeVerticalLoad(topTensionB, endB, hook);

	// Bottom sling tensions per group
	const groupALPs = groupA.map(g => g.lp);
	const groupBLPs = groupB.map(g => g.lp);

	if (groupALPs.length === 2) {
		const [t0, t1] = calcTwoSlingTension(groupALPs[0], groupALPs[1], endA, vLoadA);
		bottomSlings[0].tension = round4(t0);
		bottomSlings[1].tension = round4(t1);
	} else if (groupALPs.length === 1) {
		const len = dist3D(groupALPs[0], endA);
		const vd = Math.abs(endA.z - groupALPs[0].z);
		bottomSlings[0].tension = round4(vd > 1e-9 ? vLoadA * len / vd : vLoadA);
	} else {
		const tensions = calcLoadDistribution(groupALPs, endA, vLoadA);
		for (let i = 0; i < groupA.length; i++) bottomSlings[i].tension = round4(tensions[i]);
	}

	const bOffset = groupA.length;
	if (groupBLPs.length === 2) {
		const [t0, t1] = calcTwoSlingTension(groupBLPs[0], groupBLPs[1], endB, vLoadB);
		bottomSlings[bOffset].tension = round4(t0);
		bottomSlings[bOffset + 1].tension = round4(t1);
	} else if (groupBLPs.length === 1) {
		const len = dist3D(groupBLPs[0], endB);
		const vd = Math.abs(endB.z - groupBLPs[0].z);
		bottomSlings[bOffset].tension = round4(vd > 1e-9 ? vLoadB * len / vd : vLoadB);
	} else {
		const tensions = calcLoadDistribution(groupBLPs, endB, vLoadB);
		for (let i = 0; i < groupB.length; i++) bottomSlings[bOffset + i].tension = round4(tensions[i]);
	}

	// 11. Vertical loads
	const allSlings = [...bottomSlings, ...topSlings];
	for (const s of allSlings) {
		s.verticalLoad = round4(computeVerticalLoad(s.tension, s.from, s.to));
	}

	// 12. Warnings
	const topSlingAngleLow = topSlings.some(s => s.angleDegFromHoriz < TOP_ANGLE_WARN_DEG);
	const negativeTension = allSlings.some(s => s.tension < 0);

	// 13. Critical sling
	let criticalTier = 'bottom';
	let criticalIdx = 0;
	let maxTension = -Infinity;

	bottomSlings.forEach((s, i) => {
		if (s.tension > maxTension) { maxTension = s.tension; criticalTier = 'bottom'; criticalIdx = i; }
	});
	topSlings.forEach((s, i) => {
		if (s.tension > maxTension) { maxTension = s.tension; criticalTier = 'top'; criticalIdx = i; }
	});

	const criticalSlingArr = criticalTier === 'bottom' ? bottomSlings : topSlings;
	criticalSlingArr[criticalIdx].isCritical = true;

	// Hook height governance
	const hookZFromA = endA.z + hDistAtoHook * Math.tan(minAngleRad);
	const hookZFromB = endB.z + hDistBtoHook * Math.tan(minAngleRad);
	topSlingA.governsHookHeight = (hookZFromA >= hookZFromB);
	topSlingB.governsHookHeight = (hookZFromB > hookZFromA);

	// 14. Headroom
	const maxLPz = Math.max(...liftingPoints.map(p => p.z));

	return {
		configType: 'spreader-beam',
		hook: { x: round4(hook.x), y: round4(hook.y), z: round4(hook.z) },
		hookHeight: round4(hook.z),
		headroom: round4(hook.z - maxLPz),
		heightAboveCOG: round4(hook.z - cog.z),
		totalLoad,
		minAngleDeg,
		criticalSling: { tier: criticalTier, id: criticalIdx + 1 },
		tiers: [
			{ name: 'Bottom Slings', slings: bottomSlings },
			{ name: 'Top Slings', slings: topSlings }
		],
		beams: [{
			name: 'Spreader Beam',
			endA: { x: round4(endA.x), y: round4(endA.y), z: round4(endA.z) },
			endB: { x: round4(endB.x), y: round4(endB.y), z: round4(endB.z) },
			length: beamLength!,
			pickupPoint: null
		}],
		intermediatePoints: [
			{ x: round4(endA.x), y: round4(endA.y), z: round4(endA.z), label: 'Beam End A' },
			{ x: round4(endB.x), y: round4(endB.y), z: round4(endB.z), label: 'Beam End B' }
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
			liftBeamBendingNotChecked: false
		}
	};
}
