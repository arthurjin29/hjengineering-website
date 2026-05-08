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
	buildSling, calcTwoSlingTension, computeVerticalLoad
} from './calc-core';

const TOP_ANGLE_WARN_DEG = 30;

function computeBeamEndPair(
	lp0: Point3D, lp1: Point3D, target: Point3D,
	beamLength: number, minSlingLen: number
): { end0: Point3D; end1: Point3D } {
	const spreadAtZero = horizontalDist(lp0, lp1);

	if (spreadAtZero < 0.0001 || beamLength >= spreadAtZero) {
		function placeOnXZpath(lp: Point3D): Point3D {
			const dx = target.x - lp.x;
			const dz = target.z - lp.z;
			const xzDist = Math.sqrt(dx * dx + dz * dz);
			if (xzDist < 0.0001) return { x: lp.x, y: lp.y, z: lp.z + minSlingLen };
			const frac = Math.min(minSlingLen / xzDist, 0.95);
			return {
				x: lp.x + frac * dx,
				y: lp.y,
				z: lp.z + frac * dz
			};
		}
		return { end0: placeOnXZpath(lp0), end1: placeOnXZpath(lp1) };
	}

	let t = 1 - beamLength / spreadAtZero;

	const fullLen0 = dist3D(lp0, target);
	const fullLen1 = dist3D(lp1, target);
	const minT = Math.max(
		fullLen0 > 0 ? minSlingLen / fullLen0 : 0,
		fullLen1 > 0 ? minSlingLen / fullLen1 : 0
	);
	t = Math.max(t, minT);
	t = Math.min(t, 0.95);

	return {
		end0: {
			x: lp0.x + t * (target.x - lp0.x),
			y: lp0.y + t * (target.y - lp0.y),
			z: lp0.z + t * (target.z - lp0.z)
		},
		end1: {
			x: lp1.x + t * (target.x - lp1.x),
			y: lp1.y + t * (target.y - lp1.y),
			z: lp1.z + t * (target.z - lp1.z)
		}
	};
}

export function calculate(shared: SharedInputs, config: ConfigInputs): CalcResult {
	const { liftingPoints, cog, minAngleDeg, totalLoad } = shared;
	const { masterLength, slaveLengthA, slaveLengthB, bottomSlingLen } = config;
	const minAngleRad = degToRad(minAngleDeg);
	const minSlingLen = bottomSlingLen ?? 2;

	// 1. LP pairing
	let groupAIdxs: number[], groupBIdxs: number[];
	if (config.pairing) {
		groupAIdxs = config.pairing.groupA.map(v => v - 1);
		groupBIdxs = config.pairing.groupB.map(v => v - 1);
	} else {
		const pairingsOpt: [number, number][][] = [[[0,1],[2,3]], [[0,2],[1,3]], [[0,3],[1,2]]];
		let bestPairing = pairingsOpt[0];
		let bestDist = Infinity;
		for (const p of pairingsOpt) {
			const d = horizontalDist(liftingPoints[p[0][0]], liftingPoints[p[0][1]])
			        + horizontalDist(liftingPoints[p[1][0]], liftingPoints[p[1][1]]);
			if (d < bestDist) { bestDist = d; bestPairing = p; }
		}
		groupAIdxs = bestPairing[0];
		groupBIdxs = bestPairing[1];
	}
	const groupALPs = groupAIdxs.map(i => liftingPoints[i]);
	const groupBLPs = groupBIdxs.map(i => liftingPoints[i]);
	const groupALabels = groupAIdxs.map(i => 'LP' + (i + 1));
	const groupBLabels = groupBIdxs.map(i => 'LP' + (i + 1));

	// 2. Master beam — centered above load midpoint
	const hookXY: Point3D = { x: cog.x, y: cog.y, z: 0 };
	const lpMidA = midpoint(groupALPs[0], groupALPs[1]);
	const lpMidB = midpoint(groupBLPs[0], groupBLPs[1]);
	const masterCenter = midpoint(lpMidA, lpMidB);

	const mAxisX = lpMidB.x - lpMidA.x;
	const mAxisY = lpMidB.y - lpMidA.y;
	const mAxisLen = Math.sqrt(mAxisX * mAxisX + mAxisY * mAxisY) || 1;
	const mUx = mAxisX / mAxisLen;
	const mUy = mAxisY / mAxisLen;

	const halfMaster = masterLength! / 2;
	const masterEndAxy: Point3D = { x: masterCenter.x - mUx * halfMaster, y: masterCenter.y - mUy * halfMaster, z: 0 };
	const masterEndBxy: Point3D = { x: masterCenter.x + mUx * halfMaster, y: masterCenter.y + mUy * halfMaster, z: 0 };

	// Master beam Z
	const hDistA0 = horizontalDist(groupALPs[0], masterEndAxy);
	const hDistA1 = horizontalDist(groupALPs[1], masterEndAxy);
	const hDistB0 = horizontalDist(groupBLPs[0], masterEndBxy);
	const hDistB1 = horizontalDist(groupBLPs[1], masterEndBxy);

	const masterEndAz = Math.max(
		groupALPs[0].z + hDistA0 * Math.tan(minAngleRad),
		groupALPs[1].z + hDistA1 * Math.tan(minAngleRad)
	);
	const masterEndBz = Math.max(
		groupBLPs[0].z + hDistB0 * Math.tan(minAngleRad),
		groupBLPs[1].z + hDistB1 * Math.tan(minAngleRad)
	);
	let masterZ = Math.max(masterEndAz, masterEndBz);

	// Iteratively raise masterZ until middle slings also meet min angle
	let slaveA1: Point3D, slaveA2: Point3D, slaveB1: Point3D, slaveB2: Point3D;
	for (let iter = 0; iter < 20; iter++) {
		const mEndA: Point3D = { ...masterEndAxy, z: masterZ };
		const mEndB: Point3D = { ...masterEndBxy, z: masterZ };

		const pairA = computeBeamEndPair(groupALPs[0], groupALPs[1], mEndA, slaveLengthA!, minSlingLen);
		const pairB = computeBeamEndPair(groupBLPs[0], groupBLPs[1], mEndB, slaveLengthB!, minSlingLen);

		slaveA1 = pairA.end0;
		slaveA2 = pairA.end1;
		slaveB1 = pairB.end0;
		slaveB2 = pairB.end1;

		// Check middle sling angles and compute required masterZ
		const slaveEnds = [slaveA1, slaveA2, slaveB1, slaveB2];
		const mEnds = [mEndA, mEndA, mEndB, mEndB];
		let newMasterZ = masterZ;
		for (let i = 0; i < 4; i++) {
			const hd = horizontalDist(slaveEnds[i], mEnds[i]);
			if (hd > 0.001) {
				const requiredZ = slaveEnds[i].z + hd * Math.tan(minAngleRad);
				if (requiredZ > newMasterZ) newMasterZ = requiredZ;
			}
		}
		if (newMasterZ - masterZ < 0.001) break;
		masterZ = newMasterZ;
	}

	const masterEnds = {
		endA: { ...masterEndAxy, z: masterZ },
		endB: { ...masterEndBxy, z: masterZ }
	};

	// Actual slave beam lengths
	const actualSlaveLenA = round4(dist3D(slaveA1!, slaveA2!));
	const actualSlaveLenB = round4(dist3D(slaveB1!, slaveB2!));

	// 4. Hook — above master beam at min angle
	const hDistHA = horizontalDist(masterEnds.endA, hookXY);
	const hDistHB = horizontalDist(masterEnds.endB, hookXY);
	const hook: Point3D = {
		x: cog.x,
		y: cog.y,
		z: masterZ + Math.max(hDistHA, hDistHB) * Math.tan(minAngleRad)
	};

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

	// 7. Middle slings (4): slave beam ends -> master beam ends
	const middleSlings: Sling[] = [];
	middleSlings.push(buildSling(slingId++,
		{ ...slaveA1!, label: '2nd A End 1' },
		{ ...masterEnds.endA, label: 'Main End A' }
	));
	middleSlings.push(buildSling(slingId++,
		{ ...slaveA2!, label: '2nd A End 2' },
		{ ...masterEnds.endA, label: 'Main End A' }
	));
	middleSlings.push(buildSling(slingId++,
		{ ...slaveB1!, label: '2nd B End 1' },
		{ ...masterEnds.endB, label: 'Main End B' }
	));
	middleSlings.push(buildSling(slingId++,
		{ ...slaveB2!, label: '2nd B End 2' },
		{ ...masterEnds.endB, label: 'Main End B' }
	));

	// 8. Top slings (2): master beam ends -> hook
	const topSlings: Sling[] = [];
	const topSlingA = buildSling(slingId++,
		{ ...masterEnds.endA, label: 'Main End A' },
		{ ...hook, label: 'Hook' }
	);
	topSlings.push(topSlingA);
	const topSlingB = buildSling(slingId++,
		{ ...masterEnds.endB, label: 'Main End B' },
		{ ...hook, label: 'Hook' }
	);
	topSlings.push(topSlingB);

	// 9. Tensions — cascade downward
	const [topTensionA, topTensionB] = calcTwoSlingTension(masterEnds.endA, masterEnds.endB, hook, totalLoad);
	topSlingA.tension = round4(topTensionA);
	topSlingB.tension = round4(topTensionB);

	const vLoadMasterA = computeVerticalLoad(topTensionA, masterEnds.endA, hook);
	const vLoadMasterB = computeVerticalLoad(topTensionB, masterEnds.endB, hook);

	// Middle tier: 2 slings per master end sharing that side's vertical load
	const midTensionsA = calcTwoSlingTension(slaveA1!, slaveA2!, masterEnds.endA, vLoadMasterA);
	middleSlings[0].tension = round4(midTensionsA[0]);
	middleSlings[1].tension = round4(midTensionsA[1]);

	const midTensionsB = calcTwoSlingTension(slaveB1!, slaveB2!, masterEnds.endB, vLoadMasterB);
	middleSlings[2].tension = round4(midTensionsB[0]);
	middleSlings[3].tension = round4(midTensionsB[1]);

	// Bottom tier: each bottom sling carries the vertical load from its slave beam end
	for (let i = 0; i < 4; i++) {
		const midSling = middleSlings[i];
		const botSling = bottomSlings[i];
		const vLoad = computeVerticalLoad(midSling.tension, midSling.from, midSling.to);
		const len = dist3D(botSling.from, botSling.to);
		const vd = Math.abs(botSling.to.z - botSling.from.z);
		if (len < 0.0001 || vd < 0.0001) {
			botSling.tension = round4(vLoad);
		} else {
			botSling.tension = round4(vLoad * len / vd);
		}
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
		beams: [
			{
				name: 'Main Beam',
				endA: { x: round4(masterEnds.endA.x), y: round4(masterEnds.endA.y), z: round4(masterEnds.endA.z) },
				endB: { x: round4(masterEnds.endB.x), y: round4(masterEnds.endB.y), z: round4(masterEnds.endB.z) },
				length: round4(masterLength!), pickupPoint: null
			},
			{
				name: '2nd Lvl Beam A',
				endA: { x: round4(slaveA1!.x), y: round4(slaveA1!.y), z: round4(slaveA1!.z) },
				endB: { x: round4(slaveA2!.x), y: round4(slaveA2!.y), z: round4(slaveA2!.z) },
				length: actualSlaveLenA, pickupPoint: null
			},
			{
				name: '2nd Lvl Beam B',
				endA: { x: round4(slaveB1!.x), y: round4(slaveB1!.y), z: round4(slaveB1!.z) },
				endB: { x: round4(slaveB2!.x), y: round4(slaveB2!.y), z: round4(slaveB2!.z) },
				length: actualSlaveLenB, pickupPoint: null
			}
		],
		intermediatePoints: [
			{ ...slaveA1!, label: '2nd A End 1' }, { ...slaveA2!, label: '2nd A End 2' },
			{ ...slaveB1!, label: '2nd B End 1' }, { ...slaveB2!, label: '2nd B End 2' },
			{ x: round4(masterEnds.endA.x), y: round4(masterEnds.endA.y), z: round4(masterEnds.endA.z), label: 'Main End A' },
			{ x: round4(masterEnds.endB.x), y: round4(masterEnds.endB.y), z: round4(masterEnds.endB.z), label: 'Main End B' }
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
			liftBeamBendingNotChecked: false
		}
	};
}
