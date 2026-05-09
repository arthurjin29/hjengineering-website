/**
 * Out-of-service / storm wind — AS 5222:2021 §6
 *
 * Simplified form (§6.3 eq 11), conservative for flat open country:
 *   v(z) = f_rec * [(z/10)^0.14 + 0.4] * v_ref     (eq 11)
 *   q(z) = 0.625 * v(z)^2                          (eq 9, with ρ=1.225 kg/m³)
 *
 * f_rec depends on the design return period R:
 *   R = 5  → 0.815
 *   R = 10 → 0.873
 *   R = 20 → 0.946
 *   R = 50 → 1.000
 *
 * v_ref is the 50-yr 10-min mean storm wind speed at 10 m above flat open
 * country (Australia: see AS 1418.1).
 *
 * Inclined members (§6.4):
 *   v(z*) = v(z) * sin θ                           (eq 12)
 *   F     = q(z*) * C_f * A                        (eq 8)
 * Inclined adjustment does NOT apply to suspended hoist loads (§6.4 last para).
 */

import type { OutOfServiceInput, OutOfServiceResult, RecurrenceInterval } from './types';
import { F_REC_LOOKUP } from './types';

const Z_REF_M = 10; // reference height baked into eq 11
const HEIGHT_EXPONENT = 0.14; // simplified power exponent (φ_R=1.1, K=0.0055)
const GUST_OFFSET = 0.4; // 3-s gust enhancement on top of 10-min mean

function requireNonNeg(label: string, v: unknown): number {
	if (typeof v !== 'number' || !isFinite(v) || v < 0) {
		throw new Error(`Invalid ${label}: ${v}`);
	}
	return v;
}

export function speedAtHeight(v_ref: number, R: RecurrenceInterval, z: number): number {
	requireNonNeg('v_ref', v_ref);
	requireNonNeg('z', z);
	const f_rec = F_REC_LOOKUP[R];
	if (f_rec === undefined) throw new Error(`Invalid recurrence interval: ${R}`);
	return f_rec * (Math.pow(z / Z_REF_M, HEIGHT_EXPONENT) + GUST_OFFSET) * v_ref;
}

export function dynamicPressure(v: number): number {
	return 0.625 * v * v;
}

export function outOfService(input: OutOfServiceInput): OutOfServiceResult {
	const { v_ref, R, z, thetaDeg, A, C_f } = input;
	const f_rec = F_REC_LOOKUP[R];
	if (f_rec === undefined) throw new Error(`Invalid recurrence interval: ${R}`);

	const v_z = speedAtHeight(v_ref, R, z);
	const p_z = dynamicPressure(v_z);

	const result: OutOfServiceResult = {
		v_ref,
		R,
		f_rec,
		z,
		v_z,
		p_z,
		profile: buildProfile(v_ref, R, Math.max(z, 50))
	};

	let p_for_force = p_z;
	if (typeof thetaDeg === 'number') {
		if (thetaDeg < 0 || thetaDeg > 90) {
			throw new Error(`θ must be 0..90°, got ${thetaDeg}`);
		}
		const sinT = Math.sin((thetaDeg * Math.PI) / 180);
		result.thetaDeg = thetaDeg;
		result.v_z_inclined = v_z * sinT;
		result.p_z_inclined = dynamicPressure(result.v_z_inclined);
		p_for_force = result.p_z_inclined;
	}

	if (typeof A === 'number' && typeof C_f === 'number') {
		if (!isFinite(A) || A < 0) throw new Error(`Invalid A: ${A}`);
		if (!isFinite(C_f) || C_f < 0) throw new Error(`Invalid C_f: ${C_f}`);
		result.A = A;
		result.C_f = C_f;
		result.F = A * p_for_force * C_f;
	}

	return result;
}

function buildProfile(v_ref: number, R: RecurrenceInterval, maxHeight: number) {
	const points: { z: number; v: number; p: number }[] = [];
	const heights = [0, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
	const ceil = Math.max(maxHeight, 50);
	for (const h of heights) {
		if (h > ceil) break;
		const v = speedAtHeight(v_ref, R, h);
		points.push({ z: h, v, p: dynamicPressure(v) });
	}
	return points;
}
