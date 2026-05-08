/**
 * Automated test suite for sling-length calc — 100+ cases across all 6 configs.
 * Ported from D:/sling-length-calculator/test-calc.js.
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import type { SharedInputs, ConfigInputs, CalcResult, Point3D } from './types';
import { calculate as directCalc } from './calc-direct';
import { calculate as spreaderCalc } from './calc-spreader';
import { calculate as stingerCalc } from './calc-stinger';
import { calculate as liftbeamCalc } from './calc-liftbeam';
import { calculate as doubleParCalc } from './calc-double-par';
import { calculate as doubleCasCalc } from './calc-double-cas';

type CalcFn = (s: SharedInputs, c: ConfigInputs) => CalcResult;

interface CheckOpts {
	expectNegativeTension?: boolean;
}

function checkResult(result: CalcResult, shared: SharedInputs, opts: CheckOpts): string[] {
	const errs: string[] = [];
	const allSlings = result.tiers.flatMap(t => t.slings);

	// 1. No NaN or Infinity in key fields
	if (!isFinite(result.hookHeight)) errs.push(`hookHeight=${result.hookHeight}`);
	if (!isFinite(result.headroom)) errs.push(`headroom=${result.headroom}`);
	for (const s of allSlings) {
		if (!isFinite(s.length)) errs.push(`sling ${s.id} length=${s.length}`);
		if (!isFinite(s.angleDegFromHoriz)) errs.push(`sling ${s.id} angle=${s.angleDegFromHoriz}`);
		if (!isFinite(s.tension)) errs.push(`sling ${s.id} tension=${s.tension}`);
		if (!isFinite(s.verticalLoad)) errs.push(`sling ${s.id} vertLoad=${s.verticalLoad}`);
	}

	// 2. All sling lengths > 0
	for (const s of allSlings) {
		if (s.length <= 0) errs.push(`sling ${s.id} length=${s.length} <= 0`);
	}

	// 3. All sling angles between 0 and 90
	for (const s of allSlings) {
		if (s.angleDegFromHoriz < -0.1 || s.angleDegFromHoriz > 90.1)
			errs.push(`sling ${s.id} angle=${s.angleDegFromHoriz} out of [0,90]`);
	}

	// 4. Hook height > max LP height
	const maxLPz = Math.max(...shared.liftingPoints.map(p => p.z));
	if (result.hookHeight < maxLPz - 0.01)
		errs.push(`hookHeight ${result.hookHeight} < maxLPz ${maxLPz}`);

	// 5. Headroom > 0
	if (result.headroom < -0.01) errs.push(`headroom ${result.headroom} < 0`);

	// 6. Total vertical load ~ totalLoad (skip if expected negative or COG outside)
	if (!opts.expectNegativeTension && !result.warnings.cogOutsidePolygon) {
		const topTierSlings = result.tiers.length === 1
			? result.tiers[0].slings
			: result.tiers[result.tiers.length - 1].slings;
		const sumVLoad = topTierSlings.reduce((s, sl) => s + sl.verticalLoad, 0);
		const tolerance = shared.totalLoad * 0.05;
		if (Math.abs(sumVLoad - shared.totalLoad) > Math.max(tolerance, 0.5))
			errs.push(`top-tier vLoad sum ${sumVLoad.toFixed(2)} != totalLoad ${shared.totalLoad}`);
	}

	// 7. No negative tensions (unless expected/COG outside)
	if (!opts.expectNegativeTension && !result.warnings.cogOutsidePolygon) {
		for (const s of allSlings) {
			if (s.tension < -0.01) errs.push(`sling ${s.id} negative tension=${s.tension}`);
		}
	}

	// 8. Bottom sling angles >= minAngle (within 1 deg tolerance)
	const bottomSlings = result.tiers[0].slings;
	for (const s of bottomSlings) {
		if (s.angleDegFromHoriz < shared.minAngleDeg - 1.0)
			errs.push(`bottom sling ${s.id} angle ${s.angleDegFromHoriz} < minAngle ${shared.minAngleDeg}`);
	}

	return errs;
}

function runTest(name: string, calcFn: CalcFn, shared: SharedInputs, config: ConfigInputs, opts: CheckOpts = {}) {
	it(name, () => {
		const result = calcFn(shared, config);
		const errs = checkResult(result, shared, opts);
		expect(errs).toEqual([]);
	});
}

// LP layout helpers
function squareLPs(size: number, z = 0): Point3D[] {
	const h = size / 2;
	return [
		{ x: -h, y: -h, z }, { x: h, y: -h, z },
		{ x: h, y: h, z }, { x: -h, y: h, z }
	];
}

function rectLPs(w: number, d: number, z = 0): Point3D[] {
	const hw = w / 2, hd = d / 2;
	return [
		{ x: -hw, y: -hd, z }, { x: hw, y: -hd, z },
		{ x: hw, y: hd, z }, { x: -hw, y: hd, z }
	];
}

function trapezoidLPs(topW: number, botW: number, depth: number, z = 0): Point3D[] {
	const hd = depth / 2;
	return [
		{ x: -botW / 2, y: -hd, z }, { x: botW / 2, y: -hd, z },
		{ x: topW / 2, y: hd, z }, { x: -topW / 2, y: hd, z }
	];
}

function irregularLPs(): Point3D[] {
	return [
		{ x: -3, y: -2, z: 0 }, { x: 4, y: -1, z: 0 },
		{ x: 3, y: 3, z: 0 }, { x: -2, y: 4, z: 0 }
	];
}

function elevatedLPs(base: Point3D[], zArr: number[]): Point3D[] {
	return base.map((p, i) => ({ ...p, z: zArr[i] || 0 }));
}

// === 1. DIRECT ===
describe('Direct (4-leg)', () => {
	for (const ang of [30, 45, 60, 75]) {
		runTest(`direct-square-${ang}deg`, directCalc,
			{ liftingPoints: squareLPs(6), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: ang, totalLoad: 10 }, {});
	}

	for (const r of [{ w: 10, d: 4 }, { w: 4, d: 10 }, { w: 12, d: 2 }, { w: 2, d: 12 }]) {
		runTest(`direct-rect-${r.w}x${r.d}`, directCalc,
			{ liftingPoints: rectLPs(r.w, r.d), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 }, {});
	}

	runTest('direct-cog-offset-x', directCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 1, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 }, {});
	runTest('direct-cog-offset-y', directCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 0, y: 1.5, z: 0 }, minAngleDeg: 45, totalLoad: 10 }, {});
	runTest('direct-cog-offset-xy', directCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 1, y: 1, z: 0 }, minAngleDeg: 60, totalLoad: 15 }, {});
	runTest('direct-elevated-uniform', directCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [2, 2, 2, 2]), cog: { x: 0, y: 0, z: 2 }, minAngleDeg: 45, totalLoad: 10 }, {});
	runTest('direct-elevated-mixed', directCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [0, 1, 2, 0.5]), cog: { x: 0, y: 0, z: 0.5 }, minAngleDeg: 45, totalLoad: 10 }, {});
	runTest('direct-trapezoid', directCalc,
		{ liftingPoints: trapezoidLPs(4, 8, 6), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 12 }, {});
	runTest('direct-irregular', directCalc,
		{ liftingPoints: irregularLPs(), cog: { x: 0.5, y: 1, z: 0 }, minAngleDeg: 60, totalLoad: 8 }, {});
	runTest('direct-cog-outside', directCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 5, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 },
		{}, { expectNegativeTension: true });
	runTest('direct-tiny-spread', directCalc,
		{ liftingPoints: squareLPs(0.5), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 5 }, {});
	runTest('direct-heavy', directCalc,
		{ liftingPoints: squareLPs(10), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 500 }, {});
});

// === 2. SPREADER BEAM ===
describe('Spreader Beam', () => {
	const cases1 = [
		{ bl: 4, o: 'lengthwise', lps: rectLPs(10, 4) },
		{ bl: 6, o: 'widthwise', lps: rectLPs(10, 4) },
		{ bl: 3, o: 'lengthwise', lps: squareLPs(6) },
		{ bl: 8, o: 'lengthwise', lps: rectLPs(12, 4) },
		{ bl: 2, o: 'widthwise', lps: rectLPs(6, 10) },
		{ bl: 5, o: 'lengthwise', lps: squareLPs(8) }
	];
	cases1.forEach((t, i) => {
		runTest(`spreader-${i + 1}-bl${t.bl}-${t.o}`, spreaderCalc,
			{ liftingPoints: t.lps, cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
			{ beamLength: t.bl, orientation: t.o as 'lengthwise' | 'widthwise' });
	});

	for (const ang of [30, 60, 75]) {
		runTest(`spreader-angle-${ang}`, spreaderCalc,
			{ liftingPoints: rectLPs(8, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: ang, totalLoad: 15 },
			{ beamLength: 3, orientation: 'widthwise' });
	}

	runTest('spreader-cog-offset', spreaderCalc,
		{ liftingPoints: rectLPs(10, 4), cog: { x: 1, y: 0.5, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{ beamLength: 3, orientation: 'widthwise' });
	runTest('spreader-cog-offset-large', spreaderCalc,
		{ liftingPoints: rectLPs(10, 4), cog: { x: 2, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{ beamLength: 4, orientation: 'lengthwise' });
	runTest('spreader-elevated', spreaderCalc,
		{ liftingPoints: elevatedLPs(rectLPs(8, 4), [1, 1, 0, 0]), cog: { x: 0, y: 0, z: 0.5 }, minAngleDeg: 45, totalLoad: 15 },
		{ beamLength: 3, orientation: 'widthwise' });
	runTest('spreader-elevated-all', spreaderCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [3, 3, 3, 3]), cog: { x: 0, y: 0, z: 3 }, minAngleDeg: 45, totalLoad: 10 },
		{ beamLength: 4, orientation: 'lengthwise' });
	runTest('spreader-large-beam', spreaderCalc,
		{ liftingPoints: squareLPs(4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 },
		{ beamLength: 12, orientation: 'lengthwise' });
	runTest('spreader-trapezoid', spreaderCalc,
		{ liftingPoints: trapezoidLPs(3, 6, 5), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 15 },
		{ beamLength: 4, orientation: 'lengthwise' });
});

// === 3. STINGER ===
describe('Stinger / Equalising Triangle', () => {
	for (const tsl of [0, 2, 4, 6, 8]) {
		runTest(`stinger-tsl-${tsl}`, stingerCalc,
			{ liftingPoints: rectLPs(8, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
			{ topSlingLength: tsl });
	}

	for (const ang of [30, 60, 75]) {
		runTest(`stinger-angle-${ang}`, stingerCalc,
			{ liftingPoints: squareLPs(6), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: ang, totalLoad: 15 },
			{ topSlingLength: 3 });
	}

	runTest('stinger-cog-offset', stingerCalc,
		{ liftingPoints: rectLPs(8, 4), cog: { x: 1, y: 0.5, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{ topSlingLength: 3 });
	runTest('stinger-cog-offset-large', stingerCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 2, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 },
		{ topSlingLength: 4 });
	runTest('stinger-elevated-uniform', stingerCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [2, 2, 2, 2]), cog: { x: 0, y: 0, z: 2 }, minAngleDeg: 45, totalLoad: 10 },
		{ topSlingLength: 3 });
	runTest('stinger-elevated-mixed', stingerCalc,
		{ liftingPoints: elevatedLPs(rectLPs(8, 4), [0, 1, 2, 0.5]), cog: { x: 0, y: 0, z: 0.5 }, minAngleDeg: 45, totalLoad: 15 },
		{ topSlingLength: 4 });
	runTest('stinger-irregular', stingerCalc,
		{ liftingPoints: irregularLPs(), cog: { x: 0.5, y: 1, z: 0 }, minAngleDeg: 45, totalLoad: 12 },
		{ topSlingLength: 5 });
	runTest('stinger-trapezoid', stingerCalc,
		{ liftingPoints: trapezoidLPs(3, 7, 5), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 18 },
		{ topSlingLength: 3 });
	runTest('stinger-auto-large', stingerCalc,
		{ liftingPoints: rectLPs(12, 6), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 30 },
		{ topSlingLength: 0 });
});

// === 4. LIFTING BEAM ===
describe('Lifting Beam', () => {
	const cases2 = [
		{ bl: 8, o: 'lengthwise', lps: rectLPs(10, 4) },
		{ bl: 3, o: 'widthwise', lps: rectLPs(10, 4) },
		{ bl: 5, o: 'lengthwise', lps: squareLPs(6) },
		{ bl: 10, o: 'lengthwise', lps: rectLPs(8, 4) },
		{ bl: 4, o: 'widthwise', lps: rectLPs(4, 8) },
		{ bl: 6, o: 'lengthwise', lps: squareLPs(8) }
	];
	cases2.forEach((t, i) => {
		runTest(`liftbeam-${i + 1}`, liftbeamCalc,
			{ liftingPoints: t.lps, cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
			{ beamLength: t.bl, orientation: t.o as 'lengthwise' | 'widthwise' });
	});

	for (const ang of [30, 60]) {
		runTest(`liftbeam-angle-${ang}`, liftbeamCalc,
			{ liftingPoints: rectLPs(8, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: ang, totalLoad: 15 },
			{ beamLength: 6, orientation: 'lengthwise' });
	}

	runTest('liftbeam-cog-offset', liftbeamCalc,
		{ liftingPoints: rectLPs(10, 4), cog: { x: 2, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{ beamLength: 8, orientation: 'lengthwise' });
	runTest('liftbeam-cog-offset-y', liftbeamCalc,
		{ liftingPoints: rectLPs(10, 4), cog: { x: 0, y: 1, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{ beamLength: 8, orientation: 'lengthwise' });
	runTest('liftbeam-elevated', liftbeamCalc,
		{ liftingPoints: elevatedLPs(rectLPs(8, 4), [0, 0, 1, 1]), cog: { x: 0, y: 0, z: 0.5 }, minAngleDeg: 45, totalLoad: 15 },
		{ beamLength: 6, orientation: 'lengthwise' });
	runTest('liftbeam-elevated-all', liftbeamCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [5, 5, 5, 5]), cog: { x: 0, y: 0, z: 5 }, minAngleDeg: 60, totalLoad: 10 },
		{ beamLength: 5, orientation: 'lengthwise' });
	runTest('liftbeam-large-beam', liftbeamCalc,
		{ liftingPoints: squareLPs(4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 },
		{ beamLength: 15, orientation: 'lengthwise' });
	runTest('liftbeam-trapezoid', liftbeamCalc,
		{ liftingPoints: trapezoidLPs(4, 8, 6), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 18 },
		{ beamLength: 6, orientation: 'lengthwise' });
	runTest('liftbeam-irregular', liftbeamCalc,
		{ liftingPoints: irregularLPs(), cog: { x: 0.5, y: 1, z: 0 }, minAngleDeg: 45, totalLoad: 12 },
		{ beamLength: 5, orientation: 'lengthwise' });
});

// === 5. DOUBLE PARALLEL ===
describe('Double Spreader (Parallel)', () => {
	const cases3 = [
		{ bla: 3, blb: 3, lps: rectLPs(8, 4) },
		{ bla: 2, blb: 2, lps: squareLPs(6) },
		{ bla: 4, blb: 4, lps: rectLPs(10, 6) },
		{ bla: 1, blb: 1, lps: rectLPs(6, 3) },
		{ bla: 3, blb: 5, lps: rectLPs(10, 4) },
		{ bla: 6, blb: 6, lps: squareLPs(8) }
	];
	cases3.forEach((t, i) => {
		runTest(`dbl-par-${i + 1}`, doubleParCalc,
			{ liftingPoints: t.lps, cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
			{ beamLengthA: t.bla, beamLengthB: t.blb, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 2 });
	});

	for (const ang of [30, 60]) {
		runTest(`dbl-par-angle-${ang}`, doubleParCalc,
			{ liftingPoints: rectLPs(8, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: ang, totalLoad: 15 },
			{ beamLengthA: 3, beamLengthB: 3, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 2 });
	}

	runTest('dbl-par-cog-offset', doubleParCalc,
		{ liftingPoints: rectLPs(8, 4), cog: { x: 1, y: 0.5, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{ beamLengthA: 3, beamLengthB: 3, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 2 });
	runTest('dbl-par-cog-offset-big', doubleParCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 2, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 },
		{ beamLengthA: 3, beamLengthB: 3, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 2 });
	runTest('dbl-par-elevated', doubleParCalc,
		{ liftingPoints: elevatedLPs(rectLPs(8, 4), [0, 1, 1, 0]), cog: { x: 0, y: 0, z: 0.5 }, minAngleDeg: 45, totalLoad: 15 },
		{ beamLengthA: 3, beamLengthB: 3, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 2 });
	runTest('dbl-par-elevated-all', doubleParCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [4, 4, 4, 4]), cog: { x: 0, y: 0, z: 4 }, minAngleDeg: 45, totalLoad: 10 },
		{ beamLengthA: 3, beamLengthB: 3, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 2 });
	runTest('dbl-par-large-beam', doubleParCalc,
		{ liftingPoints: squareLPs(4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 },
		{ beamLengthA: 10, beamLengthB: 10, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 2 });
	runTest('dbl-par-trapezoid', doubleParCalc,
		{ liftingPoints: trapezoidLPs(3, 7, 5), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 18 },
		{ beamLengthA: 3, beamLengthB: 3, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 2 });
	runTest('dbl-par-long-bottom-sling', doubleParCalc,
		{ liftingPoints: rectLPs(10, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{ beamLengthA: 3, beamLengthB: 3, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 5 });
});

// === 6. DOUBLE CASCADING ===
describe('Double Spreader (Cascading)', () => {
	const cases4 = [
		{ ml: 6, sla: 3, slb: 3, lps: rectLPs(8, 4) },
		{ ml: 4, sla: 2, slb: 2, lps: squareLPs(6) },
		{ ml: 8, sla: 4, slb: 4, lps: rectLPs(10, 6) },
		{ ml: 5, sla: 3, slb: 3, lps: rectLPs(6, 4) },
		{ ml: 6, sla: 2, slb: 4, lps: rectLPs(10, 4) },
		{ ml: 10, sla: 3, slb: 3, lps: squareLPs(8) }
	];
	cases4.forEach((t, i) => {
		runTest(`dbl-cas-${i + 1}`, doubleCasCalc,
			{ liftingPoints: t.lps, cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
			{ masterLength: t.ml, slaveLengthA: t.sla, slaveLengthB: t.slb, bottomSlingLen: 2 });
	});

	for (const ang of [30, 60]) {
		runTest(`dbl-cas-angle-${ang}`, doubleCasCalc,
			{ liftingPoints: rectLPs(8, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: ang, totalLoad: 15 },
			{ masterLength: 6, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 2 });
	}

	runTest('dbl-cas-cog-offset', doubleCasCalc,
		{ liftingPoints: rectLPs(8, 4), cog: { x: 1, y: 0.5, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{ masterLength: 6, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 2 });
	runTest('dbl-cas-cog-offset-big', doubleCasCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 2, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 },
		{ masterLength: 5, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 2 });
	runTest('dbl-cas-elevated', doubleCasCalc,
		{ liftingPoints: elevatedLPs(rectLPs(8, 4), [0, 0, 2, 2]), cog: { x: 0, y: 0, z: 1 }, minAngleDeg: 45, totalLoad: 15 },
		{ masterLength: 6, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 2 });
	runTest('dbl-cas-elevated-all', doubleCasCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [3, 3, 3, 3]), cog: { x: 0, y: 0, z: 3 }, minAngleDeg: 45, totalLoad: 10 },
		{ masterLength: 5, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 2 });
	runTest('dbl-cas-large-master', doubleCasCalc,
		{ liftingPoints: squareLPs(4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 },
		{ masterLength: 12, slaveLengthA: 2, slaveLengthB: 2, bottomSlingLen: 2 });
	runTest('dbl-cas-trapezoid', doubleCasCalc,
		{ liftingPoints: trapezoidLPs(3, 7, 5), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 18 },
		{ masterLength: 5, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 2 });
	runTest('dbl-cas-irregular', doubleCasCalc,
		{ liftingPoints: irregularLPs(), cog: { x: 0.5, y: 1, z: 0 }, minAngleDeg: 45, totalLoad: 12 },
		{ masterLength: 5, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 2 });
	runTest('dbl-cas-long-bottom', doubleCasCalc,
		{ liftingPoints: rectLPs(10, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{ masterLength: 6, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 5 });
	runTest('dbl-cas-steep-75', doubleCasCalc,
		{ liftingPoints: rectLPs(6, 3), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 75, totalLoad: 10 },
		{ masterLength: 4, slaveLengthA: 2, slaveLengthB: 2, bottomSlingLen: 2 });
});

// === 7. EDGE CASES ===
describe('Edge cases', () => {
	runTest('direct-cog-at-lp-height', directCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [5, 5, 5, 5]), cog: { x: 0, y: 0, z: 5 }, minAngleDeg: 45, totalLoad: 10 }, {});
	runTest('direct-narrow', directCalc,
		{ liftingPoints: rectLPs(20, 0.5), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 30, totalLoad: 10 }, {});
	runTest('spreader-heavy-load', spreaderCalc,
		{ liftingPoints: rectLPs(12, 6), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 1000 },
		{ beamLength: 5, orientation: 'widthwise' });
	runTest('stinger-all-diff-z', stingerCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [0, 2, 4, 1]), cog: { x: 0, y: 0, z: 1 }, minAngleDeg: 45, totalLoad: 10 },
		{ topSlingLength: 4 });
	runTest('spreader-square-widthwise', spreaderCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 10 },
		{ beamLength: 3, orientation: 'widthwise' });
	runTest('dbl-cas-explicit-pair', doubleCasCalc,
		{ liftingPoints: rectLPs(8, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 45, totalLoad: 20 },
		{
			masterLength: 6, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 2,
			pairing: { groupA: [1, 2], groupB: [3, 4] }
		});
	runTest('direct-cog-above-lps', directCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 0, y: 0, z: 2 }, minAngleDeg: 45, totalLoad: 10 }, {});
	runTest('stinger-30-auto', stingerCalc,
		{ liftingPoints: rectLPs(10, 5), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 30, totalLoad: 25 },
		{ topSlingLength: 0 });
});

// === SLACK-LEG TOLERANCE CHECK ===
interface SlackOpts {
	expectApplicable?: boolean;
	checkVerticalSum?: boolean;
}

function runSlackLegTest(name: string, calcFn: CalcFn, shared: SharedInputs, config: ConfigInputs, opts: SlackOpts = {}) {
	it(name, () => {
		const result = calcFn(shared, config);
		const sla = result.slackLegAnalysis;
		const errs: string[] = [];

		if (opts.expectApplicable === false) {
			if (sla.applicable !== false) errs.push(`expected applicable=false, got ${sla.applicable}`);
		} else {
			if (sla.applicable !== true) {
				errs.push(`expected applicable=true, got ${sla.applicable}`);
			} else {
				const N = result.tiers[0].slings.length;
				if (sla.scenarios.length !== N) errs.push(`expected ${N} scenarios, got ${sla.scenarios.length}`);

				sla.scenarios.forEach((sc, i) => {
					const slackT = sc.tensions[sc.slackSlingId - 1];
					if (Math.abs(slackT) > 0.001) errs.push(`scenario ${i}: slack tension ${slackT} != 0`);
					const calcMax = Math.max(...sc.tensions);
					if (Math.abs(calcMax - sc.maxTension) > 0.01)
						errs.push(`scenario ${i}: maxTension ${sc.maxTension} != actual max ${calcMax}`);
					if (Math.abs(sc.tensions[sc.criticalSlingId - 1] - sc.maxTension) > 0.01)
						errs.push(`scenario ${i}: critical sling tension does not match maxTension`);
					sc.tensions.forEach(t => {
						if (!isFinite(t)) errs.push(`scenario ${i}: NaN tension`);
					});
				});

				if (sla.worstCase.maxTension < sla.baseMaxTension - 0.01)
					errs.push(`worstCase max ${sla.worstCase.maxTension} < base max ${sla.baseMaxTension}`);

				if (opts.checkVerticalSum) {
					sla.scenarios.forEach((sc, i) => {
						let sumV = 0;
						for (let j = 0; j < sc.tensions.length; j++) {
							if (j === sc.slackSlingId - 1) continue;
							const lp = shared.liftingPoints[j];
							const dx = result.hook.x - lp.x;
							const dy = result.hook.y - lp.y;
							const dz = result.hook.z - lp.z;
							const L = Math.sqrt(dx * dx + dy * dy + dz * dz);
							const uz = dz / L;
							sumV += sc.tensions[j] * uz;
						}
						if (Math.abs(sumV - shared.totalLoad) > 0.05)
							errs.push(`scenario ${i}: sum vertical ${sumV.toFixed(3)} != totalLoad ${shared.totalLoad}`);
					});
				}
			}
		}

		expect(errs).toEqual([]);
	});
}

describe('Slack-leg tolerance', () => {
	runSlackLegTest('slack-direct-symmetric-square', directCalc,
		{ liftingPoints: squareLPs(6), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 10, toleranceMm: 200 },
		{}, { checkVerticalSum: true });
	runSlackLegTest('slack-direct-rect', directCalc,
		{ liftingPoints: rectLPs(8, 4), cog: { x: 0.5, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 20, toleranceMm: 200 },
		{}, { checkVerticalSum: true });
	runSlackLegTest('slack-direct-elevated-mixed', directCalc,
		{ liftingPoints: elevatedLPs(squareLPs(6), [0, 1, 2, 0.5]), cog: { x: 0, y: 0, z: 0.5 }, minAngleDeg: 45, totalLoad: 10, toleranceMm: 200 },
		{}, { checkVerticalSum: true });
	runSlackLegTest('slack-direct-irregular', directCalc,
		{ liftingPoints: irregularLPs(), cog: { x: 0.5, y: 1, z: 0 }, minAngleDeg: 60, totalLoad: 8, toleranceMm: 200 },
		{}, { checkVerticalSum: true });

	runSlackLegTest('slack-spreader-not-applicable', spreaderCalc,
		{ liftingPoints: rectLPs(6, 3), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 10, toleranceMm: 200 },
		{ beamLength: 6, orientation: 'lengthwise' }, { expectApplicable: false });
	runSlackLegTest('slack-stinger-not-applicable', stingerCalc,
		{ liftingPoints: rectLPs(6, 3), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 10, toleranceMm: 200 },
		{ topSlingLength: 1 }, { expectApplicable: false });
	runSlackLegTest('slack-liftbeam-not-applicable', liftbeamCalc,
		{ liftingPoints: rectLPs(6, 3), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 10, toleranceMm: 200 },
		{ beamLength: 6, orientation: 'lengthwise' }, { expectApplicable: false });
	runSlackLegTest('slack-double-par-not-applicable', doubleParCalc,
		{ liftingPoints: rectLPs(8, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 15, toleranceMm: 200 },
		{ beamLengthA: 3, beamLengthB: 3, orientationA: 'widthwise', orientationB: 'widthwise', bottomSlingLen: 2 },
		{ expectApplicable: false });
	runSlackLegTest('slack-double-cas-not-applicable', doubleCasCalc,
		{ liftingPoints: rectLPs(8, 4), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 20, toleranceMm: 200 },
		{ masterLength: 6, slaveLengthA: 3, slaveLengthB: 3, bottomSlingLen: 2 },
		{ expectApplicable: false });

	it('slack-direct-symmetric-analytical', () => {
		const r = directCalc(
			{ liftingPoints: squareLPs(6), cog: { x: 0, y: 0, z: 0 }, minAngleDeg: 60, totalLoad: 10, toleranceMm: 200 },
			{}
		);
		expect(r.slackLegAnalysis.applicable).toBe(true);
		if (!r.slackLegAnalysis.applicable) return;

		const maxes = r.slackLegAnalysis.scenarios.map(sc => sc.maxTension);
		const allEqual = maxes.every(m => Math.abs(m - maxes[0]) < 0.01);
		expect(allEqual, `scenario maxes differ: ${maxes.join(',')}`).toBe(true);

		// Centred COG with 4 symmetric LPs at 60 deg: dropping one → opposite goes to 0,
		// the other two carry 10/(2·sin60°) = 5.7735 t each.
		expect(Math.abs(maxes[0] - 5.7735)).toBeLessThan(0.05);

		const baseMax = r.slackLegAnalysis.baseMaxTension;
		const ratio = maxes[0] / baseMax;
		expect(Math.abs(ratio - 2.0)).toBeLessThan(0.05);
	});
});
