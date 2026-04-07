/**
 * 4-Leg Direct Sling Calculation
 * Ported from calc-direct.js — 4 slings from hook directly to 4 LPs.
 */

import type { SharedInputs, ConfigInputs, CalcResult, Point3D } from './types';
import {
	degToRad, round4, pointInPolygon2D, horizontalDist,
	buildSling, calcLoadDistribution, computeVerticalLoad
} from './calc-core';

export function calculate(shared: SharedInputs, _config: ConfigInputs): CalcResult {
	const { liftingPoints, cog, minAngleDeg, totalLoad } = shared;
	const minAngleRad = degToRad(minAngleDeg);

	const cogInsidePolygon = pointInPolygon2D(
		cog, liftingPoints.map(lp => ({ x: lp.x, y: lp.y, z: 0 }))
	);

	const hookXY: Point3D = { x: cog.x, y: cog.y, z: 0 };
	const hDists = liftingPoints.map(lp => horizontalDist(lp, hookXY));

	const requiredHookZs = liftingPoints.map((lp, i) => {
		return lp.z + hDists[i] * Math.tan(minAngleRad);
	});

	const hookZ = Math.max(...requiredHookZs);
	const hook: Point3D = { x: hookXY.x, y: hookXY.y, z: hookZ };

	const slings = liftingPoints.map((lp, i) => {
		const from = { x: lp.x, y: lp.y, z: lp.z, label: `LP${i + 1}` };
		const to = { x: hook.x, y: hook.y, z: hook.z, label: 'Hook' };
		const sling = buildSling(i + 1, from, to);
		sling.governsHookHeight = Math.abs(requiredHookZs[i] - hookZ) < 0.0001;
		return sling;
	});

	// Load distribution (min-norm least squares, N=4)
	const tensions = calcLoadDistribution(liftingPoints, hook, totalLoad);
	let hasNegativeTension = false;
	slings.forEach((s, i) => {
		s.tension = round4(tensions[i]);
		if (tensions[i] < -0.001) hasNegativeTension = true;
		s.verticalLoad = round4(computeVerticalLoad(tensions[i], s.from, s.to));
	});

	// Critical sling = highest tension
	let maxTension = -Infinity;
	let criticalIndex = 0;
	slings.forEach((s, i) => {
		if (s.tension > maxTension) {
			maxTension = s.tension;
			criticalIndex = i;
		}
	});
	slings[criticalIndex].isCritical = true;

	const maxLPz = Math.max(...liftingPoints.map(lp => lp.z));

	return {
		configType: 'direct',
		hook,
		hookHeight: round4(hookZ),
		headroom: round4(hookZ - maxLPz),
		heightAboveCOG: round4(hookZ - cog.z),
		totalLoad,
		minAngleDeg,
		criticalSling: { tier: 'bottom', id: criticalIndex + 1 },
		tiers: [{
			name: 'Slings',
			slings
		}],
		beams: [],
		intermediatePoints: [],
		warnings: {
			cogOutsidePolygon: !cogInsidePolygon,
			negativeTension: hasNegativeTension,
			topSlingAngleLow: false,
			liftBeamBendingNotChecked: false
		}
	};
}
