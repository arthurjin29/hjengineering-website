/**
 * Sling Length Calculator — Shared Core Utilities
 * Pure math functions used by all config modules.
 * Ported from calc-core.js — math is preserved exactly.
 */

import type { Point3D, LabeledPoint, Sling } from './types';

export function degToRad(d: number): number { return d * Math.PI / 180; }
export function radToDeg(r: number): number { return r * 180 / Math.PI; }
export function round2(v: number): number { return Math.round(v * 100) / 100; }
export function round4(v: number): number { return Math.round(v * 10000) / 10000; }

export function horizontalDist(a: Point3D, b: Point3D): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
}

export function dist3D(a: Point3D, b: Point3D): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function midpoint(a: Point3D, b: Point3D): Point3D {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

export function lerp3D(a: Point3D, b: Point3D, t: number): Point3D {
	return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: a.z + t * (b.z - a.z) };
}

/**
 * Pair 4 lifting points into the two pairs that minimise total in-pair
 * horizontal distance. Returns [[i,j], [k,l]] — index pairs for groups A and B.
 */
export function autoPairLPs(liftingPoints: Point3D[]): [[number, number], [number, number]] {
	const pairings: [[number, number], [number, number]][] = [
		[[0, 1], [2, 3]],
		[[0, 2], [1, 3]],
		[[0, 3], [1, 2]]
	];
	let bestPairing = pairings[0];
	let bestDist = Infinity;
	for (const p of pairings) {
		const d = horizontalDist(liftingPoints[p[0][0]], liftingPoints[p[0][1]])
		        + horizontalDist(liftingPoints[p[1][0]], liftingPoints[p[1][1]]);
		if (d < bestDist) { bestDist = d; bestPairing = p; }
	}
	return bestPairing;
}

export function pointInPolygon2D(point: Point3D, polygon: Point3D[]): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i].x, yi = polygon[i].y;
		const xj = polygon[j].x, yj = polygon[j].y;
		const intersect = ((yi > point.y) !== (yj > point.y)) &&
			(point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
		if (intersect) inside = !inside;
	}
	return inside;
}

function transposeNxM(A: number[][], m: number, n: number): number[][] {
	const T: number[][] = [];
	for (let j = 0; j < n; j++) {
		T[j] = [];
		for (let i = 0; i < m; i++) T[j][i] = A[i][j];
	}
	return T;
}

function matMxNMultiply(A: number[][], B: number[][], m: number, n: number, p: number): number[][] {
	const C: number[][] = [];
	for (let i = 0; i < m; i++) {
		C[i] = [];
		for (let j = 0; j < p; j++) {
			let sum = 0;
			for (let k = 0; k < n; k++) sum += A[i][k] * B[k][j];
			C[i][j] = sum;
		}
	}
	return C;
}

function mat3x3Inverse(m: number[][]): number[][] | null {
	const det =
		m[0][0] * (m[1][1]*m[2][2] - m[1][2]*m[2][1]) -
		m[0][1] * (m[1][0]*m[2][2] - m[1][2]*m[2][0]) +
		m[0][2] * (m[1][0]*m[2][1] - m[1][1]*m[2][0]);
	if (Math.abs(det) < 1e-12) return null;
	const invDet = 1 / det;
	return [
		[(m[1][1]*m[2][2] - m[1][2]*m[2][1]) * invDet, (m[0][2]*m[2][1] - m[0][1]*m[2][2]) * invDet, (m[0][1]*m[1][2] - m[0][2]*m[1][1]) * invDet],
		[(m[1][2]*m[2][0] - m[1][0]*m[2][2]) * invDet, (m[0][0]*m[2][2] - m[0][2]*m[2][0]) * invDet, (m[0][2]*m[1][0] - m[0][0]*m[1][2]) * invDet],
		[(m[1][0]*m[2][1] - m[1][1]*m[2][0]) * invDet, (m[0][1]*m[2][0] - m[0][0]*m[2][1]) * invDet, (m[0][0]*m[1][1] - m[0][1]*m[1][0]) * invDet]
	];
}

export function calcLoadDistribution(points: Point3D[], hook: Point3D, totalLoad: number): number[] {
	const N = points.length;
	const A: number[][] = [[], [], []];
	const b = [0, 0, totalLoad];

	for (let i = 0; i < N; i++) {
		const dx = points[i].x - hook.x;
		const dy = points[i].y - hook.y;
		const dz = points[i].z - hook.z;
		const L = Math.sqrt(dx * dx + dy * dy + dz * dz);

		if (L < 0.0001) {
			A[0][i] = 0; A[1][i] = 0; A[2][i] = 1;
		} else {
			A[0][i] = (hook.x - points[i].x) / L;
			A[1][i] = (hook.y - points[i].y) / L;
			A[2][i] = (hook.z - points[i].z) / L;
		}
	}

	if (N >= 3) {
		const AT = transposeNxM(A, 3, N);
		const AAT = matMxNMultiply(A, AT, 3, N, 3);
		const AATinv = mat3x3Inverse(AAT);
		if (!AATinv) return Array(N).fill(totalLoad / N);

		const AATinvB: number[] = [];
		for (let i = 0; i < 3; i++) {
			AATinvB[i] = AATinv[i][0] * b[0] + AATinv[i][1] * b[1] + AATinv[i][2] * b[2];
		}
		const t: number[] = [];
		for (let i = 0; i < N; i++) {
			t[i] = AT[i][0] * AATinvB[0] + AT[i][1] * AATinvB[1] + AT[i][2] * AATinvB[2];
		}
		return t;
	} else {
		const uz0 = A[2][0], uz1 = A[2][1];
		if (Math.abs(uz0) < 0.0001 && Math.abs(uz1) < 0.0001) return [totalLoad / 2, totalLoad / 2];

		const dx0 = points[0].x - hook.x, dy0 = points[0].y - hook.y;
		const dx1 = points[1].x - hook.x, dy1 = points[1].y - hook.y;
		const arm0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
		const arm1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
		const totalArm = arm0 + arm1;

		let vLoad0: number, vLoad1: number;
		if (totalArm < 0.0001) { vLoad0 = totalLoad / 2; vLoad1 = totalLoad / 2; }
		else { vLoad0 = totalLoad * arm1 / totalArm; vLoad1 = totalLoad * arm0 / totalArm; }

		const t0 = Math.abs(uz0) > 0.0001 ? vLoad0 / uz0 : vLoad0;
		const t1 = Math.abs(uz1) > 0.0001 ? vLoad1 / uz1 : vLoad1;
		return [t0, t1];
	}
}

export function calcTwoSlingTension(pointA: Point3D, pointB: Point3D, hook: Point3D, totalLoad: number): [number, number] {
	const result = calcLoadDistribution([pointA, pointB], hook, totalLoad);
	return [result[0], result[1]];
}

export function buildSling(id: number, from: LabeledPoint, to: LabeledPoint): Sling {
	const hd = horizontalDist(from, to);
	const vd = Math.abs(to.z - from.z);
	const length = dist3D(from, to);
	const angleRad = Math.atan2(vd, hd);
	const angleDeg = radToDeg(angleRad);
	return {
		id, from, to,
		length: round4(length),
		horizontalDist: round4(hd),
		verticalDist: round4(vd),
		angleDegFromHoriz: round2(angleDeg),
		angleDegFromVert: round2(90 - angleDeg),
		tension: 0, verticalLoad: 0, isCritical: false, governsHookHeight: false
	};
}

export function getOrientationAxis(liftingPoints: Point3D[], orientation: string): { x: number; y: number } {
	const xs = liftingPoints.map(p => p.x);
	const ys = liftingPoints.map(p => p.y);
	const rangeX = Math.max(...xs) - Math.min(...xs);
	const rangeY = Math.max(...ys) - Math.min(...ys);
	const lengthwiseIsX = rangeX >= rangeY;
	if (orientation === 'lengthwise') return lengthwiseIsX ? { x: 1, y: 0 } : { x: 0, y: 1 };
	return lengthwiseIsX ? { x: 0, y: 1 } : { x: 1, y: 0 };
}

export function computeBeamEnds(centre: Point3D, length: number, axis: { x: number; y: number }) {
	const halfLen = length / 2;
	return {
		endA: { x: centre.x - axis.x * halfLen, y: centre.y - axis.y * halfLen, z: centre.z },
		endB: { x: centre.x + axis.x * halfLen, y: centre.y + axis.y * halfLen, z: centre.z }
	};
}

export function computeBeamEndZ(groupLPs: Point3D[], beamEndXY: Point3D, minAngleRad: number): number {
	let maxZ = -Infinity;
	for (const lp of groupLPs) {
		const hd = horizontalDist(lp, beamEndXY);
		const requiredZ = lp.z + hd * Math.tan(minAngleRad);
		if (requiredZ > maxZ) maxZ = requiredZ;
	}
	return maxZ;
}

/**
 * Place beam ends on direct sling paths from each LP toward a target point.
 * Path: P(t) = LP + t * (target - LP); pair horizontal spread shrinks with t.
 * - If beam length >= LP horizontal spread, beam handles the short axis fully:
 *   ends sit on the LP's vertical X-Z path, sharing the LP's Y, with
 *   minSlingLen along the path.
 * - Otherwise, ends sit on the direct sling paths at the t where horizontal
 *   spread equals beamLength, clamped by minSlingLen and t<=0.95.
 */
export function computeBeamEndPair(
	lp0: Point3D, lp1: Point3D, target: Point3D,
	beamLength: number, minSlingLen: number
): { end0: Point3D; end1: Point3D } {
	const spreadAtZero = horizontalDist(lp0, lp1);

	if (spreadAtZero < 0.0001 || beamLength >= spreadAtZero) {
		const placeOnXZpath = (lp: Point3D): Point3D => {
			const dx = target.x - lp.x;
			const dz = target.z - lp.z;
			const xzDist = Math.sqrt(dx * dx + dz * dz);
			if (xzDist < 0.0001) return { x: lp.x, y: lp.y, z: lp.z + minSlingLen };
			const frac = Math.min(minSlingLen / xzDist, 0.95);
			return { x: lp.x + frac * dx, y: lp.y, z: lp.z + frac * dz };
		};
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

	return { end0: lerp3D(lp0, target, t), end1: lerp3D(lp1, target, t) };
}

export function computeVerticalLoad(tension: number, from: Point3D, to: Point3D): number {
	const length = dist3D(from, to);
	if (length < 0.0001) return 0;
	const vd = Math.abs(to.z - from.z);
	return tension * vd / length;
}

export interface SlackLegRawScenario {
	slackSlingIndex: number;
	tensions: number[];
	maxTension: number;
	criticalSlingIndex: number;
	infeasible: boolean;
}

export interface SlackLegRawResult {
	scenarios: SlackLegRawScenario[];
	worstCase: {
		slackSlingIndex: number;
		criticalSlingIndex: number;
		maxTension: number;
	};
}

export function analyzeSlackLeg(
	points: Point3D[],
	hook: Point3D,
	totalLoad: number
): SlackLegRawResult | null {
	const N = points.length;
	if (N < 4) return null;

	const scenarios: SlackLegRawScenario[] = [];
	let worstMaxTension = -Infinity;
	let worstSlackIdx = 0;
	let worstCriticalIdx = 0;

	for (let slackIdx = 0; slackIdx < N; slackIdx++) {
		const remaining = points.filter((_, j) => j !== slackIdx);
		const partial = calcLoadDistribution(remaining, hook, totalLoad);

		const fullTensions: number[] = Array(N).fill(0);
		let k = 0;
		for (let j = 0; j < N; j++) {
			if (j === slackIdx) continue;
			fullTensions[j] = partial[k++];
		}

		let maxT = -Infinity;
		let critIdx = 0;
		let hasNeg = false;
		for (let j = 0; j < N; j++) {
			if (fullTensions[j] < -0.001) hasNeg = true;
			if (fullTensions[j] > maxT) {
				maxT = fullTensions[j];
				critIdx = j;
			}
		}

		scenarios.push({
			slackSlingIndex: slackIdx,
			tensions: fullTensions.map(round4),
			maxTension: round4(maxT),
			criticalSlingIndex: critIdx,
			infeasible: hasNeg
		});

		if (maxT > worstMaxTension) {
			worstMaxTension = maxT;
			worstSlackIdx = slackIdx;
			worstCriticalIdx = critIdx;
		}
	}

	return {
		scenarios,
		worstCase: {
			slackSlingIndex: worstSlackIdx,
			criticalSlingIndex: worstCriticalIdx,
			maxTension: round4(worstMaxTension)
		}
	};
}
