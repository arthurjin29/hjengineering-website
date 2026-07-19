/**
 * Sling Length Calculator — Double Spreader (Parallel) Configuration
 *
 * Two independent spreader beams, each sitting on the direct sling paths.
 * The beams handle the short direction — converting converging slings into
 * parallel slings. Bottom sling angles match the 4-leg direct config.
 *
 * Bottom tier: 4 slings from 4 LPs to beam ends (on direct sling paths)
 * Top tier:    4 slings from 4 beam ends to hook
 */

import type { SharedInputs, ConfigInputs, CalcResult, Point3D } from './types';
import {
	degToRad, round4, horizontalDist, dist3D, pointInPolygon2D,
	buildSling, computeVerticalLoad, autoPairLPs,
	computeSupportReactions, solveHangingBeam, applyLoadSharingFactor
} from './calc-core';

const TOP_ANGLE_WARN_DEG = 30;

export function calculate(shared: SharedInputs, config: ConfigInputs): CalcResult {
	const { liftingPoints, cog, minAngleDeg, totalLoad } = shared;
	const { beamLengthA, beamLengthB, bottomSlingLen } = config;
	const minSlingLen = bottomSlingLen || 2;
	const minAngleRad = degToRad(minAngleDeg);

	// 1. Auto-pair LPs by proximity
	const [groupAIdxs, groupBIdxs] = autoPairLPs(liftingPoints);
	const groupALPs = groupAIdxs.map(i => liftingPoints[i]);
	const groupBLPs = groupBIdxs.map(i => liftingPoints[i]);
	const groupALabels = groupAIdxs.map(i => 'LP' + (i + 1));
	const groupBLabels = groupBIdxs.map(i => 'LP' + (i + 1));

	// 2. Per-LP vertical shares (min-norm rigid-body reactions)
	const reactions = computeSupportReactions(liftingPoints, cog, totalLoad);
	const anyNegReaction = reactions.some(r => r < -1e-9);
	const wA0 = Math.max(0, reactions[groupAIdxs[0]]);
	const wA1 = Math.max(0, reactions[groupAIdxs[1]]);
	const wB0 = Math.max(0, reactions[groupBIdxs[0]]);
	const wB1 = Math.max(0, reactions[groupBIdxs[1]]);

	// 3. Fixed-length hanging beams. Hook is over the total COG; its height is set by
	//    the min top-sling angle over the beam ends. Poses depend on the hook height
	//    and the hook height depends on the ends, so iterate.
	const hookXY: Point3D = { x: cog.x, y: cog.y, z: 0 };
	let hookZ = Math.max(...liftingPoints.map(lp => lp.z + horizontalDist(lp, hookXY) * Math.tan(minAngleRad)));
	let beamA1: Point3D = { x: 0, y: 0, z: 0 }, beamA2: Point3D = { x: 0, y: 0, z: 0 };
	let beamB1: Point3D = { x: 0, y: 0, z: 0 }, beamB2: Point3D = { x: 0, y: 0, z: 0 };
	let convergedA = true, convergedB = true, hookConverged = false;
	for (let outer = 0; outer < 12; outer++) {
		const rA = solveHangingBeam(groupALPs[0], groupALPs[1], wA0, wA1, hookXY, hookZ, beamLengthA!, minAngleRad, minSlingLen);
		const rB = solveHangingBeam(groupBLPs[0], groupBLPs[1], wB0, wB1, hookXY, hookZ, beamLengthB!, minAngleRad, minSlingLen);
		beamA1 = rA.end0; beamA2 = rA.end1; beamB1 = rB.end0; beamB2 = rB.end1;
		convergedA = rA.converged; convergedB = rB.converged;
		const ends = [beamA1, beamA2, beamB1, beamB2];
		const newHookZ = Math.max(...ends.map(e => e.z + horizontalDist(e, hookXY) * Math.tan(minAngleRad)));
		if (Math.abs(newHookZ - hookZ) < 1e-4) { hookZ = newHookZ; hookConverged = true; break; }
		hookZ = newHookZ;
	}
	const hook: Point3D = { x: cog.x, y: cog.y, z: hookZ };

	// 4. COG polygon validation
	const cogOutsidePolygon = !pointInPolygon2D(cog, liftingPoints);

	// 5. Bottom slings (4 total: LP -> beam end on sling path)
	const bottomSlings = [];
	let slingId = 1;

	bottomSlings.push(buildSling(slingId++,
		{ x: groupALPs[0].x, y: groupALPs[0].y, z: groupALPs[0].z, label: groupALabels[0] },
		{ x: beamA1.x, y: beamA1.y, z: beamA1.z, label: 'Beam A End 1' }
	));
	bottomSlings.push(buildSling(slingId++,
		{ x: groupALPs[1].x, y: groupALPs[1].y, z: groupALPs[1].z, label: groupALabels[1] },
		{ x: beamA2.x, y: beamA2.y, z: beamA2.z, label: 'Beam A End 2' }
	));
	bottomSlings.push(buildSling(slingId++,
		{ x: groupBLPs[0].x, y: groupBLPs[0].y, z: groupBLPs[0].z, label: groupBLabels[0] },
		{ x: beamB1.x, y: beamB1.y, z: beamB1.z, label: 'Beam B End 1' }
	));
	bottomSlings.push(buildSling(slingId++,
		{ x: groupBLPs[1].x, y: groupBLPs[1].y, z: groupBLPs[1].z, label: groupBLabels[1] },
		{ x: beamB2.x, y: beamB2.y, z: beamB2.z, label: 'Beam B End 2' }
	));

	// 6. Top slings (4 total: beam ends -> hook)
	const allBeamEnds: Point3D[] = [beamA1, beamA2, beamB1, beamB2];
	const beamEndLabels = ['Beam A End 1', 'Beam A End 2', 'Beam B End 1', 'Beam B End 2'];
	const topSlings = [];

	for (let i = 0; i < 4; i++) {
		const be = allBeamEnds[i];
		topSlings.push(buildSling(slingId++,
			{ x: be.x, y: be.y, z: be.z, label: beamEndLabels[i] },
			{ x: hook.x, y: hook.y, z: hook.z, label: 'Hook' }
		));
	}

	// 7. Tensions — per-beam determinate: each end's top vertical component is that
	//    LP's load share (replaces the 4-leg calcLoadDistribution).
	const endW = [wA0, wA1, wB0, wB1];
	for (let i = 0; i < 4; i++) {
		const be = allBeamEnds[i], w = endW[i];
		const topLen = dist3D(be, hook);
		const topVd = hook.z - be.z;
		topSlings[i].tension = round4(topVd > 1e-9 ? w * topLen / topVd : w);
	}
	for (let i = 0; i < 4; i++) {
		const s = bottomSlings[i], w = endW[i];
		const len = dist3D(s.from, s.to);
		const vd = Math.abs(s.to.z - s.from.z);
		s.tension = round4((len < 0.0001 || vd < 0.0001) ? w : w * len / vd);
	}

	// 8. Vertical loads
	const allSlings = [...bottomSlings, ...topSlings];
	for (const s of allSlings) {
		s.verticalLoad = round4(computeVerticalLoad(s.tension, s.from, s.to));
	}

	// 9. Warnings
	const topSlingAngleLow = topSlings.some(s => s.angleDegFromHoriz < TOP_ANGLE_WARN_DEG);
	const negativeTension = allSlings.some(s => s.tension < 0);

	// 10. Critical sling
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

	// 11. Headroom
	const maxLPz = Math.max(...liftingPoints.map(p => p.z));

	// Compute actual beam lengths for display
	const actualBeamLenA = round4(dist3D(beamA1, beamA2));
	const actualBeamLenB = round4(dist3D(beamB1, beamB2));

	const loadSharingAnalysis = applyLoadSharingFactor(
		bottomSlings.map(s => s.tension),
		'double-parallel',
		shared.toleranceMode
	);

	return {
		configType: 'double-parallel',
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
		loadSharingAnalysis,
		beams: [
			{
				name: 'Beam A',
				endA: { x: round4(beamA1.x), y: round4(beamA1.y), z: round4(beamA1.z) },
				endB: { x: round4(beamA2.x), y: round4(beamA2.y), z: round4(beamA2.z) },
				length: actualBeamLenA,
				pickupPoint: null
			},
			{
				name: 'Beam B',
				endA: { x: round4(beamB1.x), y: round4(beamB1.y), z: round4(beamB1.z) },
				endB: { x: round4(beamB2.x), y: round4(beamB2.y), z: round4(beamB2.z) },
				length: actualBeamLenB,
				pickupPoint: null
			}
		],
		intermediatePoints: [
			{ x: round4(beamA1.x), y: round4(beamA1.y), z: round4(beamA1.z), label: 'Beam A End 1' },
			{ x: round4(beamA2.x), y: round4(beamA2.y), z: round4(beamA2.z), label: 'Beam A End 2' },
			{ x: round4(beamB1.x), y: round4(beamB1.y), z: round4(beamB1.z), label: 'Beam B End 1' },
			{ x: round4(beamB2.x), y: round4(beamB2.y), z: round4(beamB2.z), label: 'Beam B End 2' }
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
			beamEquilibriumNotConverged: !convergedA || !convergedB || !hookConverged,
			liftBeamBendingNotChecked: false,
			subCogFallback: anyNegReaction
		}
	};
}
