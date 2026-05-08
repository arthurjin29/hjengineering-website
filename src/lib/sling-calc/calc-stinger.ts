/**
 * Stinger / Equalising Triangle Calculation
 *
 * The stinger splits a 4-leg direct lift: at a junction point along each
 * pair's path, two slings become one. Bottom sling angles match the direct
 * config. The apex sits on the line from LP-pair centre to hook.
 *
 * User defines top sling length (0 = auto, halfway along pair-centre-to-hook).
 */

import type { SharedInputs, ConfigInputs, CalcResult, Point3D } from './types';
import {
	degToRad, round4, horizontalDist, dist3D, midpoint, lerp3D,
	pointInPolygon2D, buildSling, calcTwoSlingTension, computeVerticalLoad,
	autoPairLPs
} from './calc-core';

function findApexOnLine(
	lp0: Point3D, lp1: Point3D, pairCentre: Point3D,
	hookPt: Point3D, minAngleRad: number
): number {
	const dx = hookPt.x - pairCentre.x;
	const dy = hookPt.y - pairCentre.y;
	const dz = hookPt.z - pairCentre.z;
	let lo = 0.01, hi = 0.99;
	for (let i = 0; i < 15; i++) {
		const t = (lo + hi) / 2;
		const ax = pairCentre.x + t * dx;
		const ay = pairCentre.y + t * dy;
		const az = pairCentre.z + t * dz;
		const hd0 = horizontalDist(lp0, { x: ax, y: ay, z: 0 });
		const vd0 = az - lp0.z;
		const hd1 = horizontalDist(lp1, { x: ax, y: ay, z: 0 });
		const vd1 = az - lp1.z;
		const a0 = hd0 > 0.001 ? Math.atan2(vd0, hd0) : Math.PI / 2;
		const a1 = hd1 > 0.001 ? Math.atan2(vd1, hd1) : Math.PI / 2;
		if (Math.min(a0, a1) < minAngleRad) { lo = t; } else { hi = t; }
	}
	return hi;
}

export function calculate(shared: SharedInputs, config: ConfigInputs): CalcResult {
	const { liftingPoints, cog, minAngleDeg, totalLoad } = shared;
	const minAngleRad = degToRad(minAngleDeg);
	const tanMinAngle = Math.tan(minAngleRad);

	// --- 1. Auto-pair LPs by proximity ---
	const [groupAIndices, groupBIndices] = autoPairLPs(liftingPoints);
	const groupALPs = groupAIndices.map(i => liftingPoints[i]);
	const groupBLPs = groupBIndices.map(i => liftingPoints[i]);

	// --- 2. Reference hook from 4-leg direct geometry ---
	const hookXY: Point3D = { x: cog.x, y: cog.y, z: 0 };
	const refHookZ = Math.max(...liftingPoints.map(lp =>
		lp.z + horizontalDist(lp, hookXY) * tanMinAngle
	));
	const refHook: Point3D = { x: hookXY.x, y: hookXY.y, z: refHookZ };

	// --- 3. Pair centres ---
	const pairCentreA = midpoint(groupALPs[0], groupALPs[1]);
	const pairCentreB = midpoint(groupBLPs[0], groupBLPs[1]);

	// Horizontal distances from pair centres to hook (constant across iterations)
	const hDistPcA = horizontalDist(pairCentreA, hookXY);
	const hDistPcB = horizontalDist(pairCentreB, hookXY);

	// --- 4. Iteratively find apex + hook ---
	let topLen = config.topSlingLength || 0;
	let hookZ = refHookZ;
	let apexA: Point3D;
	let apexB: Point3D;

	if (topLen <= 0) topLen = 1;
	{
		for (let iter = 0; iter < 40; iter++) {
			const currentHook: Point3D = { x: hookXY.x, y: hookXY.y, z: hookZ };
			const tA = findApexOnLine(groupALPs[0], groupALPs[1], pairCentreA, currentHook, minAngleRad);
			const tB = findApexOnLine(groupBLPs[0], groupBLPs[1], pairCentreB, currentHook, minAngleRad);

			apexA = lerp3D(pairCentreA, currentHook, tA);
			apexB = lerp3D(pairCentreB, currentHook, tB);

			const hdA = (1 - tA) * hDistPcA;
			const hdB = (1 - tB) * hDistPcB;
			const hzA = topLen > hdA ? apexA.z + Math.sqrt(topLen * topLen - hdA * hdA) : apexA.z + hdA * tanMinAngle;
			const hzB = topLen > hdB ? apexB.z + Math.sqrt(topLen * topLen - hdB * hdB) : apexB.z + hdB * tanMinAngle;
			const newHookZ = Math.max(hzA, hzB);

			if (Math.abs(newHookZ - hookZ) < 0.001) break;
			// Damped update to prevent oscillation at non-60 angles
			hookZ = 0.5 * hookZ + 0.5 * newHookZ;
		}

		// Reposition both apexes so each top sling = exactly topLen
		const finalHook: Point3D = { x: hookXY.x, y: hookXY.y, z: hookZ };
		const fullDistA = dist3D(pairCentreA, finalHook);
		const fullDistB = dist3D(pairCentreB, finalHook);
		const tFinalA = fullDistA > 0.001 ? Math.max(0.01, 1 - topLen / fullDistA) : 0.5;
		const tFinalB = fullDistB > 0.001 ? Math.max(0.01, 1 - topLen / fullDistB) : 0.5;
		apexA = lerp3D(pairCentreA, finalHook, tFinalA);
		apexB = lerp3D(pairCentreB, finalHook, tFinalB);
	}

	const hook: Point3D = { x: hookXY.x, y: hookXY.y, z: hookZ };

	// --- 5. COG polygon validation ---
	const cogInsidePolygon = pointInPolygon2D(
		cog, liftingPoints.map(lp => ({ x: lp.x, y: lp.y, z: 0 }))
	);

	// --- 6. Build top slings ---
	const topSlingA = buildSling(1,
		{ ...apexA!, label: 'Apex A' },
		{ ...hook, label: 'Hook' }
	);
	const topSlingB = buildSling(2,
		{ ...apexB!, label: 'Apex B' },
		{ ...hook, label: 'Hook' }
	);

	// --- 7. Top sling tensions ---
	const topTensions = calcTwoSlingTension(apexA!, apexB!, hook, totalLoad);
	topSlingA.tension = round4(topTensions[0]);
	topSlingB.tension = round4(topTensions[1]);
	const vLoadA = round4(computeVerticalLoad(topTensions[0], apexA!, hook));
	const vLoadB = round4(computeVerticalLoad(topTensions[1], apexB!, hook));
	topSlingA.verticalLoad = vLoadA;
	topSlingB.verticalLoad = vLoadB;
	const topSlings = [topSlingA, topSlingB];

	// --- 8. Bottom sling tensions ---
	const bottomTensionsA = calcTwoSlingTension(groupALPs[0], groupALPs[1], apexA!, vLoadA);
	const bottomTensionsB = calcTwoSlingTension(groupBLPs[0], groupBLPs[1], apexB!, vLoadB);

	// --- 9. Build bottom slings ---
	const bottomSlings = [];
	let slingId = 1;
	const groups = [
		{ indices: groupAIndices, lps: groupALPs, apex: apexA!, tensions: bottomTensionsA },
		{ indices: groupBIndices, lps: groupBLPs, apex: apexB!, tensions: bottomTensionsB }
	];
	for (const g of groups) {
		for (let i = 0; i < 2; i++) {
			const sling = buildSling(slingId++,
				{ ...g.lps[i], label: 'LP' + (g.indices[i] + 1) },
				{ ...g.apex, label: g === groups[0] ? 'Apex A' : 'Apex B' }
			);
			sling.tension = round4(g.tensions[i]);
			sling.verticalLoad = round4(computeVerticalLoad(g.tensions[i], sling.from, sling.to));
			bottomSlings.push(sling);
		}
	}

	// --- 10. Warnings ---
	const allSlings = [...bottomSlings, ...topSlings];
	const bottomAngleLow = bottomSlings.some(s => s.angleDegFromHoriz < minAngleDeg - 0.1);
	const topSlingAngleLow = topSlings.some(s => s.angleDegFromHoriz < 30);
	let hasNegativeTension = false;

	// --- 11. Critical sling ---
	let criticalTier = 'bottom';
	let criticalIdx = 0;
	let maxTension = -Infinity;

	bottomSlings.forEach((s, i) => {
		if (s.tension < -0.001) hasNegativeTension = true;
		if (s.tension > maxTension) { maxTension = s.tension; criticalTier = 'bottom'; criticalIdx = i; }
	});
	topSlings.forEach((s, i) => {
		if (s.tension < -0.001) hasNegativeTension = true;
		if (s.tension > maxTension) { maxTension = s.tension; criticalTier = 'top'; criticalIdx = i; }
	});

	const criticalArr = criticalTier === 'bottom' ? bottomSlings : topSlings;
	criticalArr[criticalIdx].isCritical = true;

	const maxLPz = Math.max(...liftingPoints.map(lp => lp.z));

	return {
		configType: 'stinger',
		hook,
		hookHeight: round4(hookZ),
		headroom: round4(hookZ - maxLPz),
		heightAboveCOG: round4(hookZ - cog.z),
		totalLoad,
		minAngleDeg,
		criticalSling: { tier: criticalTier, id: criticalIdx + 1 },
		tiers: [
			{ name: 'Bottom Slings', slings: bottomSlings },
			{ name: 'Top Slings', slings: topSlings }
		],
		beams: [],
		intermediatePoints: [
			{ x: round4(apexA!.x), y: round4(apexA!.y), z: round4(apexA!.z), label: 'Apex A' },
			{ x: round4(apexB!.x), y: round4(apexB!.y), z: round4(apexB!.z), label: 'Apex B' }
		],
		slackLegAnalysis: {
			applicable: false,
			toleranceMm: shared.toleranceMm != null ? shared.toleranceMm : 200,
			reason: 'Tolerance check requires geometric perturbation analysis for paired sling configurations (not yet implemented).'
		},
		warnings: {
			cogOutsidePolygon: !cogInsidePolygon,
			negativeTension: hasNegativeTension,
			topSlingAngleLow,
			bottomAngleLow,
			liftBeamBendingNotChecked: false
		}
	};
}
