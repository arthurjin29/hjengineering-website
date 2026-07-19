/**
 * Sling Length Calculator — Shared Core Utilities
 * Pure math functions used by all config modules.
 * Ported from calc-core.js — math is preserved exactly.
 */

import type { Point3D, LabeledPoint, Sling, LoadSharingAnalysis } from './types';

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

export function mat2x2Inverse(m: number[][]): number[][] | null {
	const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
	if (Math.abs(det) < 1e-12) return null;
	const invDet = 1 / det;
	return [
		[m[1][1] * invDet, -m[0][1] * invDet],
		[-m[1][0] * invDet, m[0][0] * invDet]
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

/**
 * Minimum-norm rigid-body support reactions for a load on N support points.
 * Solves A·R = b with rows [1..], [x_i - cog.x], [y_i - cog.y] and
 * b = [totalLoad, 0, 0] (vertical equilibrium + moment balance about the COG).
 * Statically indeterminate for N>3 → min-norm solution R = Aᵀ(AAᵀ)⁻¹b.
 * By construction ΣR = totalLoad and the reaction-weighted centroid of the
 * points equals the COG. Entries may be negative when the COG is near or
 * outside the support hull (caller should guard).
 */
export function computeSupportReactions(
	points: { x: number; y: number }[],
	cog: { x: number; y: number },
	totalLoad: number
): number[] {
	const N = points.length;
	const A: number[][] = [[], [], []];
	for (let i = 0; i < N; i++) {
		A[0][i] = 1;
		A[1][i] = points[i].x - cog.x;
		A[2][i] = points[i].y - cog.y;
	}
	const b = [totalLoad, 0, 0];
	const AT = transposeNxM(A, 3, N);
	const AAT = matMxNMultiply(A, AT, 3, N, 3);
	const AATinv = mat3x3Inverse(AAT);
	if (!AATinv) return Array(N).fill(totalLoad / N);
	const y: number[] = [];
	for (let i = 0; i < 3; i++) {
		y[i] = AATinv[i][0] * b[0] + AATinv[i][1] * b[1] + AATinv[i][2] * b[2];
	}
	const R: number[] = [];
	for (let i = 0; i < N; i++) {
		R[i] = AT[i][0] * y[0] + AT[i][1] * y[1] + AT[i][2] * y[2];
	}
	return R;
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
 * Compute beam end Z with both min angle AND min sling length constraints.
 * Returns the Z that satisfies both.
 */
export function computeBeamEndZWithMinSling(
	groupLPs: Point3D[], beamEndXY: Point3D, minAngleRad: number, minSlingLen: number
): number {
	let maxZ = -Infinity;
	for (const lp of groupLPs) {
		const hd = horizontalDist(lp, beamEndXY);
		const zFromAngle = lp.z + hd * Math.tan(minAngleRad);
		const zFromLen = (minSlingLen > hd) ? lp.z + Math.sqrt(minSlingLen * minSlingLen - hd * hd) : lp.z;
		const requiredZ = Math.max(zFromAngle, zFromLen);
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

/**
 * Fixed-length beam end placement for a 2-LP group. Rigid bar of `length`, axis
 * along the LP-pair line, positioned so it hangs plumb under a pick over `subCOG`:
 *   C = subCOG - u * (length/2) * (wB - wA) / (wA + wB)
 * with u the unit vector from lpA to lpB. Returns plan (x,y); caller sets z.
 * end0 is on the lpA side, end1 on the lpB side.
 */
export function fixedBeamEnds(
	lpA: { x: number; y: number }, lpB: { x: number; y: number },
	wA: number, wB: number, subCOG: { x: number; y: number }, length: number
): { end0: { x: number; y: number }; end1: { x: number; y: number } } {
	const dx = lpB.x - lpA.x, dy = lpB.y - lpA.y;
	const axisLen = Math.sqrt(dx * dx + dy * dy);
	const half = length / 2;
	if (axisLen < 1e-9) {
		return { end0: { x: subCOG.x, y: subCOG.y }, end1: { x: subCOG.x, y: subCOG.y } };
	}
	const ux = dx / axisLen, uy = dy / axisLen;
	const W = wA + wB;
	let cx: number, cy: number;
	if (W < 1e-9) {
		cx = (lpA.x + lpB.x) / 2; cy = (lpA.y + lpB.y) / 2;
	} else {
		const shift = half * (wB - wA) / W;
		cx = subCOG.x - ux * shift; cy = subCOG.y - uy * shift;
	}
	return {
		end0: { x: cx - ux * half, y: cy - uy * half },
		end1: { x: cx + ux * half, y: cy + uy * half }
	};
}

/**
 * Solve a fixed-length spreader beam's free-hanging equilibrium pose (one LP per
 * end). The rigid bar (length `length`, axis free to yaw) carries its two LPs via
 * bottom slings and hangs from `hook` (over the total COG, height `H`) via two top
 * slings. Damped Newton on centre (cx,cy) + yaw (th) drives the beam's net
 * horizontal force to zero. Beam height is set by the min bottom-sling angle AND
 * the min bottom-sling length. Falls back to the seed pose on non-convergence.
 */
export function solveHangingBeam(
	lpA: Point3D, lpB: Point3D, wA: number, wB: number,
	hook: Point3D, H: number, length: number, minAngleRad: number, minSling: number
): { end0: Point3D; end1: Point3D; converged: boolean } {
	const half = length / 2;
	const tan = Math.tan(minAngleRad);
	const W = wA + wB;
	const subx = (W > 1e-9) ? (wA * lpA.x + wB * lpB.x) / W : (lpA.x + lpB.x) / 2;
	const suby = (W > 1e-9) ? (wA * lpA.y + wB * lpB.y) / W : (lpA.y + lpB.y) / 2;
	let cx = subx, cy = suby, th = Math.atan2(lpB.y - lpA.y, lpB.x - lpA.x);
	const cx0 = cx, cy0 = cy, th0 = th;

	const endsOf = (cx: number, cy: number, th: number) => {
		const ux = Math.cos(th), uy = Math.sin(th);
		return {
			ea: { x: cx - ux * half, y: cy - uy * half },
			eb: { x: cx + ux * half, y: cy + uy * half },
			ux, uy
		};
	};
	const zBof = (ea: { x: number; y: number }, eb: { x: number; y: number }): number => {
		const req = (e: { x: number; y: number }, lp: Point3D) => {
			const hd = Math.hypot(e.x - lp.x, e.y - lp.y);
			const za = lp.z + hd * tan;
			const zl = (minSling > hd) ? lp.z + Math.sqrt(Math.max(0, minSling * minSling - hd * hd)) : lp.z;
			return Math.max(za, zl);
		};
		return Math.max(req(ea, lpA), req(eb, lpB));
	};
	const residual = (cx: number, cy: number, th: number): number[] => {
		const { ea, eb, ux, uy } = endsOf(cx, cy, th);
		const z = zBof(ea, eb);
		const hvec = (e: { x: number; y: number }, lp: Point3D, w: number) => {
			const dzTop = H - z, dzBot = z - lp.z;
			return {
				x: w * ((hook.x - e.x) / dzTop + (lp.x - e.x) / dzBot),
				y: w * ((hook.y - e.y) / dzTop + (lp.y - e.y) / dzBot)
			};
		};
		const ha = hvec(ea, lpA, wA), hb = hvec(eb, lpB, wB);
		return [ha.x + hb.x, ha.y + hb.y, ux * ha.y - uy * ha.x];
	};

	let converged = false;
	const damp = 0.6, eps = 1e-6;
	for (let it = 0; it < 80; it++) {
		const r = residual(cx, cy, th);
		if (!isFinite(r[0] + r[1] + r[2])) break;
		if (Math.hypot(r[0], r[1], r[2]) < 1e-7) { converged = true; break; }
		const r1 = residual(cx + eps, cy, th), r2 = residual(cx, cy + eps, th), r3 = residual(cx, cy, th + eps);
		const J = [
			[(r1[0] - r[0]) / eps, (r2[0] - r[0]) / eps, (r3[0] - r[0]) / eps],
			[(r1[1] - r[1]) / eps, (r2[1] - r[1]) / eps, (r3[1] - r[1]) / eps],
			[(r1[2] - r[2]) / eps, (r2[2] - r[2]) / eps, (r3[2] - r[2]) / eps]
		];
		const Ji = mat3x3Inverse(J);
		if (!Ji) break;
		const d = [
			-(Ji[0][0] * r[0] + Ji[0][1] * r[1] + Ji[0][2] * r[2]),
			-(Ji[1][0] * r[0] + Ji[1][1] * r[1] + Ji[1][2] * r[2]),
			-(Ji[2][0] * r[0] + Ji[2][1] * r[1] + Ji[2][2] * r[2])
		];
		if (!isFinite(d[0] + d[1] + d[2])) break;
		cx += damp * d[0]; cy += damp * d[1]; th += damp * d[2];
	}
	if (!converged) { cx = cx0; cy = cy0; th = th0; }
	const { ea, eb } = endsOf(cx, cy, th);
	const z = zBof(ea, eb);
	return { end0: { x: ea.x, y: ea.y, z }, end1: { x: eb.x, y: eb.y, z }, converged };
}

/**
 * Solve the cascade Main beam's free-hang pose (fixed length, axis free to yaw).
 * Each end carries a whole sub-spreader via TWO middle slings plus one top sling
 * up to `hook` (height H). Damped Newton on centre + yaw; beam height z raised so
 * every middle sling (pick → sub end) meets `middleAngleRad`. Returns ends + z.
 */
export function solveCascadeMainBeam(
	eA0: Point3D, eA1: Point3D, wA0: number, wA1: number,
	eB0: Point3D, eB1: Point3D, wB0: number, wB1: number,
	hook: Point3D, H: number, length: number, middleAngleRad: number
): { end0: Point3D; end1: Point3D; z: number; converged: boolean } {
	const half = length / 2;
	const tanMid = Math.tan(middleAngleRad);
	const WA = wA0 + wA1, WB = wB0 + wB1, W = WA + WB;
	const subAx = WA > 1e-9 ? (wA0 * eA0.x + wA1 * eA1.x) / WA : (eA0.x + eA1.x) / 2;
	const subAy = WA > 1e-9 ? (wA0 * eA0.y + wA1 * eA1.y) / WA : (eA0.y + eA1.y) / 2;
	const subBx = WB > 1e-9 ? (wB0 * eB0.x + wB1 * eB1.x) / WB : (eB0.x + eB1.x) / 2;
	const subBy = WB > 1e-9 ? (wB0 * eB0.y + wB1 * eB1.y) / WB : (eB0.y + eB1.y) / 2;
	let cx = W > 1e-9 ? (WA * subAx + WB * subBx) / W : (subAx + subBx) / 2;
	let cy = W > 1e-9 ? (WA * subAy + WB * subBy) / W : (subAy + subBy) / 2;
	let th = Math.atan2(subBy - subAy, subBx - subAx);
	const cx0 = cx, cy0 = cy, th0 = th;

	const endsOf = (cx: number, cy: number, th: number) => {
		const ux = Math.cos(th), uy = Math.sin(th);
		return { pa: { x: cx - ux * half, y: cy - uy * half }, pb: { x: cx + ux * half, y: cy + uy * half }, ux, uy };
	};
	const zOf = (pa: { x: number; y: number }, pb: { x: number; y: number }): number => {
		const req = (p: { x: number; y: number }, e: Point3D) => e.z + Math.hypot(p.x - e.x, p.y - e.y) * tanMid;
		return Math.max(req(pa, eA0), req(pa, eA1), req(pb, eB0), req(pb, eB1));
	};
	const EPS_DZ = 1e-9;
	const residual = (cx: number, cy: number, th: number): number[] => {
		const { pa, pb, ux, uy } = endsOf(cx, cy, th);
		const z = zOf(pa, pb);
		const dzTop = Math.max(EPS_DZ, H - z);
		const hvec = (p: { x: number; y: number }, e0: Point3D, e1: Point3D, w0: number, w1: number) => {
			const Ws = w0 + w1, dz0 = Math.max(EPS_DZ, z - e0.z), dz1 = Math.max(EPS_DZ, z - e1.z);
			return {
				x: Ws * (hook.x - p.x) / dzTop + w0 * (e0.x - p.x) / dz0 + w1 * (e1.x - p.x) / dz1,
				y: Ws * (hook.y - p.y) / dzTop + w0 * (e0.y - p.y) / dz0 + w1 * (e1.y - p.y) / dz1
			};
		};
		const ha = hvec(pa, eA0, eA1, wA0, wA1), hb = hvec(pb, eB0, eB1, wB0, wB1);
		return [ha.x + hb.x, ha.y + hb.y, ux * ha.y - uy * ha.x];
	};

	let converged = false;
	const damp = 0.6, eps = 1e-6;
	const rScale = Math.max(W, 1e-9);
	for (let it = 0; it < 80; it++) {
		const r = residual(cx, cy, th);
		if (!isFinite(r[0] + r[1] + r[2])) break;
		if (Math.hypot(r[0], r[1], r[2]) / rScale < 1e-9) { converged = true; break; }
		const r1 = residual(cx + eps, cy, th), r2 = residual(cx, cy + eps, th), r3 = residual(cx, cy, th + eps);
		const J = [
			[(r1[0] - r[0]) / eps, (r2[0] - r[0]) / eps, (r3[0] - r[0]) / eps],
			[(r1[1] - r[1]) / eps, (r2[1] - r[1]) / eps, (r3[1] - r[1]) / eps],
			[(r1[2] - r[2]) / eps, (r2[2] - r[2]) / eps, (r3[2] - r[2]) / eps]
		];
		const Ji = mat3x3Inverse(J);
		if (!Ji) break;
		const d = [
			-(Ji[0][0] * r[0] + Ji[0][1] * r[1] + Ji[0][2] * r[2]),
			-(Ji[1][0] * r[0] + Ji[1][1] * r[1] + Ji[1][2] * r[2]),
			-(Ji[2][0] * r[0] + Ji[2][1] * r[1] + Ji[2][2] * r[2])
		];
		if (!isFinite(d[0] + d[1] + d[2])) break;
		cx += damp * d[0]; cy += damp * d[1]; th += damp * d[2];
	}
	if (!converged) { cx = cx0; cy = cy0; th = th0; }
	const { pa, pb } = endsOf(cx, cy, th);
	const z = zOf(pa, pb);
	return { end0: { x: pa.x, y: pa.y, z }, end1: { x: pb.x, y: pb.y, z }, z, converged };
}

/**
 * Solve a fixed-length spreader beam's free-hang pose when each end may carry MORE
 * THAN ONE lifting point (generalises solveHangingBeam). End A carries LPs `lpsA`
 * with loads `wsA`; end B carries `lpsB`/`wsB`. Each end has one top sling up to
 * `hook` (height H). Damped Newton on centre + yaw; beam height z from min-angle
 * AND min bottom-sling length over every actual bottom sling.
 */
export function solveSpreaderBeam(
	lpsA: Point3D[], wsA: number[], lpsB: Point3D[], wsB: number[],
	hook: Point3D, H: number, length: number, minAngleRad: number, minSling: number
): { end0: Point3D; end1: Point3D; converged: boolean } {
	const half = length / 2;
	const tan = Math.tan(minAngleRad);
	const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
	const WA = sum(wsA), WB = sum(wsB), W = WA + WB;
	const cen = (lps: Point3D[], ws: number[], Wt: number) => (Wt > 1e-9)
		? { x: lps.reduce((s, p, i) => s + ws[i] * p.x, 0) / Wt, y: lps.reduce((s, p, i) => s + ws[i] * p.y, 0) / Wt }
		: { x: lps.reduce((s, p) => s + p.x, 0) / lps.length, y: lps.reduce((s, p) => s + p.y, 0) / lps.length };
	const subA = cen(lpsA, wsA, WA), subB = cen(lpsB, wsB, WB);
	let cx = W > 1e-9 ? (WA * subA.x + WB * subB.x) / W : (subA.x + subB.x) / 2;
	let cy = W > 1e-9 ? (WA * subA.y + WB * subB.y) / W : (subA.y + subB.y) / 2;
	let th = Math.atan2(subB.y - subA.y, subB.x - subA.x);
	const cx0 = cx, cy0 = cy, th0 = th;

	const endsOf = (cx: number, cy: number, th: number) => {
		const ux = Math.cos(th), uy = Math.sin(th);
		return { ea: { x: cx - ux * half, y: cy - uy * half }, eb: { x: cx + ux * half, y: cy + uy * half }, ux, uy };
	};
	const zBof = (ea: { x: number; y: number }, eb: { x: number; y: number }): number => {
		const reqEnd = (e: { x: number; y: number }, lps: Point3D[]) => Math.max(...lps.map(lp => {
			const hd = Math.hypot(e.x - lp.x, e.y - lp.y);
			const za = lp.z + hd * tan;
			const zl = (minSling > hd) ? lp.z + Math.sqrt(Math.max(0, minSling * minSling - hd * hd)) : lp.z;
			return Math.max(za, zl);
		}));
		return Math.max(reqEnd(ea, lpsA), reqEnd(eb, lpsB));
	};
	const EPS_DZ = 1e-9;
	const residual = (cx: number, cy: number, th: number): number[] => {
		const { ea, eb, ux, uy } = endsOf(cx, cy, th);
		const z = zBof(ea, eb);
		const dzTop = Math.max(EPS_DZ, H - z);
		const hvec = (e: { x: number; y: number }, lps: Point3D[], ws: number[], Wend: number) => {
			let hx = Wend * (hook.x - e.x) / dzTop, hy = Wend * (hook.y - e.y) / dzTop;
			for (let i = 0; i < lps.length; i++) {
				const dz = Math.max(EPS_DZ, z - lps[i].z);
				hx += ws[i] * (lps[i].x - e.x) / dz;
				hy += ws[i] * (lps[i].y - e.y) / dz;
			}
			return { x: hx, y: hy };
		};
		const ha = hvec(ea, lpsA, wsA, WA), hb = hvec(eb, lpsB, wsB, WB);
		return [ha.x + hb.x, ha.y + hb.y, ux * ha.y - uy * ha.x];
	};

	let converged = false;
	const damp = 0.6, eps = 1e-6;
	const rScale = Math.max(W, 1e-9);
	for (let it = 0; it < 80; it++) {
		const r = residual(cx, cy, th);
		if (!isFinite(r[0] + r[1] + r[2])) break;
		if (Math.hypot(r[0], r[1], r[2]) / rScale < 1e-9) { converged = true; break; }
		const r1 = residual(cx + eps, cy, th), r2 = residual(cx, cy + eps, th), r3 = residual(cx, cy, th + eps);
		const J = [
			[(r1[0] - r[0]) / eps, (r2[0] - r[0]) / eps, (r3[0] - r[0]) / eps],
			[(r1[1] - r[1]) / eps, (r2[1] - r[1]) / eps, (r3[1] - r[1]) / eps],
			[(r1[2] - r[2]) / eps, (r2[2] - r[2]) / eps, (r3[2] - r[2]) / eps]
		];
		const Ji = mat3x3Inverse(J);
		if (!Ji) break;
		const d = [
			-(Ji[0][0] * r[0] + Ji[0][1] * r[1] + Ji[0][2] * r[2]),
			-(Ji[1][0] * r[0] + Ji[1][1] * r[1] + Ji[1][2] * r[2]),
			-(Ji[2][0] * r[0] + Ji[2][1] * r[1] + Ji[2][2] * r[2])
		];
		if (!isFinite(d[0] + d[1] + d[2])) break;
		cx += damp * d[0]; cy += damp * d[1]; th += damp * d[2];
	}
	if (!converged) { cx = cx0; cy = cy0; th = th0; }
	const { ea, eb } = endsOf(cx, cy, th);
	const z = zBof(ea, eb);
	return { end0: { x: ea.x, y: ea.y, z }, end1: { x: eb.x, y: eb.y, z }, converged };
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

/**
 * Load-sharing tolerance factor — applies an empirical multiplier to the
 * theoretical max-loaded sling tension to account for real-world sling-length
 * tolerance. Factors are from Nobles "Lifting the Bar" Edition 2 (crane-scale
 * measurements on 4-leg sling lifts with one leg shortened).
 *
 * Tolerance is expressed as a PROPORTION of sling length, not an absolute length,
 * because load-share degradation is governed by the ratio (Δ/L). Modes:
 *   'theoretical' → factor 1.0 (rigid-body solver result, no tolerance)
 *   'pct2_5'      → ±2.5% length deviation (matched / measured slings)
 *   'pct12_5'     → ±12.5% length deviation (unmatched / site-modified slings)
 */
export const LOAD_SHARING_FACTORS: Record<string, { pct2_5: number | null; pct12_5: number | null }> = {
	'direct':          { pct2_5: 1.88, pct12_5: null },
	'spreader-beam':   { pct2_5: 1.18, pct12_5: 1.68 },
	'lifting-beam':    { pct2_5: 1.18, pct12_5: 1.68 },
	'double-parallel': { pct2_5: 1.18, pct12_5: 1.68 },
	'stinger':         { pct2_5: 1.36, pct12_5: 2.00 },
	'double-cascade':  { pct2_5: 1.36, pct12_5: 2.00 }
};

export function applyLoadSharingFactor(
	tensions: number[], configType: string, toleranceMode?: string | null
): LoadSharingAnalysis {
	const baseMaxTension = round4(Math.max(...tensions));
	const noblesSource = "Nobles 'Lifting the Bar' Edition 2 — empirical 4-leg testing";

	if (toleranceMode === 'theoretical' || toleranceMode == null) {
		return {
			toleranceMode: 'theoretical',
			applicable: true,
			factor: 1.0,
			baseMaxTension,
			adjustedMaxTension: baseMaxTension,
			source: 'Theoretical (rigid-body geometric solver, no tolerance applied)',
			note: ''
		};
	}

	const cfg = LOAD_SHARING_FACTORS[configType];
	if (!cfg) {
		return {
			toleranceMode, applicable: false, factor: null,
			baseMaxTension, adjustedMaxTension: null, source: noblesSource,
			note: `No tolerance factor available for configType '${configType}'.`
		};
	}

	const factor = cfg[toleranceMode as 'pct2_5' | 'pct12_5'];
	if (factor == null) {
		return {
			toleranceMode, applicable: false, factor: null,
			baseMaxTension, adjustedMaxTension: null, source: noblesSource,
			note: `Nobles did not measure ${toleranceMode === 'pct12_5' ? '±12.5%' : '±2.5%'} length deviation for this arrangement — use a lighter tolerance or theoretical.`
		};
	}

	return {
		toleranceMode, applicable: true, factor,
		baseMaxTension,
		adjustedMaxTension: round4(baseMaxTension * factor),
		source: noblesSource,
		note: ''
	};
}
