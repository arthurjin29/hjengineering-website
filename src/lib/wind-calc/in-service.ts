/**
 * In-service wind — AS 5222:2021 §5
 *
 * §5.2 Suspended load:   F_w = c_H * A_H * p          (eq 3)
 * §5.3 Single member:    F   = A * p * C_f             (eq 4)
 * §5.5 Multi-frame:      F_n = (1 - η^n)/(1 - η) * F   (eq 5) for n = 1..8
 *                        F_n = F_8 for n > 8 (constant after the 9th frame)
 * §5.6 Inclined member:  F_α = F * sin(α)              (eq 7)
 */

import type {
	SuspendedLoadInput,
	SuspendedLoadResult,
	MemberInput,
	MemberResult
} from './types';

export function suspendedLoad(input: SuspendedLoadInput): SuspendedLoadResult {
	const { pressure, c_H, A_H } = input;
	if (!isFinite(c_H) || c_H < 0) throw new Error(`Invalid c_H: ${c_H}`);
	if (!isFinite(A_H) || A_H < 0) throw new Error(`Invalid A_H: ${A_H}`);
	const F_w = c_H * A_H * pressure.p;
	return { pressure, c_H, A_H, F_w };
}

export function memberForce(input: MemberInput): MemberResult {
	const { pressure, A, C_f, frames, inclinationDeg } = input;
	if (!isFinite(A) || A < 0) throw new Error(`Invalid A: ${A}`);
	if (!isFinite(C_f) || C_f < 0) throw new Error(`Invalid C_f: ${C_f}`);

	const F_single = A * pressure.p * C_f;

	const result: MemberResult = { pressure, A, C_f, F_single };

	if (typeof inclinationDeg === 'number') {
		if (inclinationDeg < 0 || inclinationDeg > 90) {
			throw new Error(`Inclination must be 0..90°, got ${inclinationDeg}`);
		}
		const rad = (inclinationDeg * Math.PI) / 180;
		result.F_inclined = F_single * Math.sin(rad);
	}

	if (frames) {
		const { count, eta } = frames;
		if (!Number.isInteger(count) || count < 1) {
			throw new Error(`Frame count must be a positive integer, got ${count}`);
		}
		if (!isFinite(eta) || eta < 0 || eta > 1) {
			throw new Error(`Shielding factor η must be in [0, 1], got ${eta}`);
		}

		// F_n series: cumulative force on first n frames where each subsequent frame
		// is shielded by η. F_1 = F, F_2 = F + ηF, ... F_n = (1-η^n)/(1-η) * F per AS 5222 eq 5.
		// Constant after the 9th frame: F_9..F_n all equal F_8 marginal.
		const cumulative: number[] = [];
		const cap = Math.min(count, 8);
		for (let n = 1; n <= cap; n++) {
			const factor = eta === 1 ? n : (1 - Math.pow(eta, n)) / (1 - eta);
			cumulative.push(factor * F_single);
		}
		// Marginal force on the 8th frame (used for frames 9+)
		const marginal8 = cap >= 8 ? cumulative[7] - cumulative[6] : 0;
		for (let n = 9; n <= count; n++) {
			cumulative.push(cumulative[cumulative.length - 1] + marginal8);
		}

		result.frameForces = cumulative;
		result.F_total = cumulative[cumulative.length - 1];
		const unshielded = count * F_single;
		result.shieldingReductionPct = unshielded === 0 ? 0 : (1 - result.F_total / unshielded) * 100;
	}

	return result;
}
