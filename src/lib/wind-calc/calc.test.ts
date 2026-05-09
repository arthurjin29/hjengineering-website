/**
 * Wind calc test suite — AS 5222:2021.
 * Hand-checked worked examples against the formulas in §4, §5, §6.
 */

import { describe, it, expect } from 'vitest';
import { pressureFromSpeed, manualPressure, presetPressure } from './pressure';
import { suspendedLoad, memberForce } from './in-service';
import { speedAtHeight, dynamicPressure, outOfService } from './out-of-service';
import { IN_SERVICE_PRESETS, F_REC_LOOKUP } from './types';

const APPROX = 1e-6;

describe('pressure (§4)', () => {
	it('eq 2: p = 0.625 * v^2', () => {
		expect(pressureFromSpeed(20)).toBeCloseTo(250, 6);
		expect(pressureFromSpeed(14)).toBeCloseTo(122.5, 6);
		expect(pressureFromSpeed(28.5)).toBeCloseTo(507.65625, 6);
		expect(pressureFromSpeed(0)).toBe(0);
	});

	it('rejects invalid speed', () => {
		expect(() => pressureFromSpeed(-1)).toThrow();
		expect(() => pressureFromSpeed(NaN)).toThrow();
		expect(() => pressureFromSpeed(Infinity)).toThrow();
	});

	it('manual pressure tags source', () => {
		const r = manualPressure(25);
		expect(r.v_s).toBe(25);
		expect(r.p).toBeCloseTo(0.625 * 25 * 25, 6);
		expect(r.source).toBe('manual');
	});

	it('preset pressure matches Table 1 standard values', () => {
		// AS 5222 publishes p = 125 / 250 / 500 N/m² for the three categories
		// (rounded — exact values from p=0.625*v² are 122.5 / 250 / 507.66).
		expect(presetPressure('secured').p).toBe(125);
		expect(presetPressure('normal').p).toBe(250);
		expect(presetPressure('process').p).toBe(500);
		expect(presetPressure('secured').v_s).toBe(14);
		expect(presetPressure('normal').v_s).toBe(20);
		expect(presetPressure('process').v_s).toBe(28.5);
	});

	it('IN_SERVICE_PRESETS has all three categories', () => {
		expect(Object.keys(IN_SERVICE_PRESETS).sort()).toEqual(['normal', 'process', 'secured']);
	});
});

describe('suspended load (§5.2 eq 3)', () => {
	it('worked example: 6 m² billboard, c_H=1.2, normal outdoor wind', () => {
		// p = 250 N/m², F_w = 1.2 * 6 * 250 = 1800 N
		const r = suspendedLoad({ pressure: presetPressure('normal'), c_H: 1.2, A_H: 6 });
		expect(r.F_w).toBeCloseTo(1800, APPROX);
	});

	it('worked example: 12 m² panel, c_H=1.4, secured wind', () => {
		// p = 125, F_w = 1.4 * 12 * 125 = 2100 N
		const r = suspendedLoad({ pressure: presetPressure('secured'), c_H: 1.4, A_H: 12 });
		expect(r.F_w).toBeCloseTo(2100, APPROX);
	});

	it('zero area gives zero force', () => {
		const r = suspendedLoad({ pressure: presetPressure('normal'), c_H: 1.2, A_H: 0 });
		expect(r.F_w).toBe(0);
	});

	it('rejects negative inputs', () => {
		expect(() => suspendedLoad({ pressure: presetPressure('normal'), c_H: -1, A_H: 5 })).toThrow();
		expect(() => suspendedLoad({ pressure: presetPressure('normal'), c_H: 1.2, A_H: -5 })).toThrow();
	});
});

describe('single member (§5.3 eq 4)', () => {
	it('worked example: A=2 m², C_f=1.5, normal wind → F = 750 N', () => {
		const r = memberForce({ pressure: presetPressure('normal'), A: 2, C_f: 1.5 });
		expect(r.F_single).toBeCloseTo(750, APPROX);
		expect(r.F_inclined).toBeUndefined();
		expect(r.frameForces).toBeUndefined();
	});

	it('matches manual pressure', () => {
		// p(15 m/s) = 140.625, F = 5 * 140.625 * 1.0 = 703.125
		const r = memberForce({ pressure: manualPressure(15), A: 5, C_f: 1.0 });
		expect(r.F_single).toBeCloseTo(703.125, APPROX);
	});
});

describe('inclined member (§5.6 eq 7)', () => {
	it('90° (perpendicular) gives full force', () => {
		const r = memberForce({
			pressure: presetPressure('normal'), A: 2, C_f: 1.5, inclinationDeg: 90
		});
		expect(r.F_inclined).toBeCloseTo(750, APPROX);
	});

	it('30° gives F * 0.5', () => {
		const r = memberForce({
			pressure: presetPressure('normal'), A: 2, C_f: 1.5, inclinationDeg: 30
		});
		expect(r.F_inclined).toBeCloseTo(375, APPROX);
	});

	it('0° (parallel) gives zero', () => {
		const r = memberForce({
			pressure: presetPressure('normal'), A: 2, C_f: 1.5, inclinationDeg: 0
		});
		expect(r.F_inclined).toBeCloseTo(0, APPROX);
	});

	it('rejects out-of-range angles', () => {
		expect(() => memberForce({
			pressure: presetPressure('normal'), A: 2, C_f: 1.5, inclinationDeg: -1
		})).toThrow();
		expect(() => memberForce({
			pressure: presetPressure('normal'), A: 2, C_f: 1.5, inclinationDeg: 91
		})).toThrow();
	});
});

describe('multi-frame shielding (§5.5 eq 5)', () => {
	const base = { pressure: presetPressure('normal'), A: 2, C_f: 1.5 }; // F_single = 750

	it('1 frame: F_total = F_single', () => {
		const r = memberForce({ ...base, frames: { count: 1, eta: 0.5 } });
		expect(r.frameForces).toEqual([750]);
		expect(r.F_total).toBeCloseTo(750, APPROX);
	});

	it('2 frames η=0.5: F_total = (1+0.5) * 750 = 1125', () => {
		const r = memberForce({ ...base, frames: { count: 2, eta: 0.5 } });
		expect(r.F_total).toBeCloseTo(1125, APPROX);
	});

	it('3 frames η=0.5: F_total = (1 + 0.5 + 0.25) * 750 = 1312.5', () => {
		const r = memberForce({ ...base, frames: { count: 3, eta: 0.5 } });
		expect(r.F_total).toBeCloseTo(1312.5, APPROX);
	});

	it('η=0 (full shielding): F_total = F_single regardless of n', () => {
		const r = memberForce({ ...base, frames: { count: 5, eta: 0 } });
		expect(r.F_total).toBeCloseTo(750, APPROX);
	});

	it('η=1 (no shielding): F_total = n * F_single', () => {
		const r = memberForce({ ...base, frames: { count: 4, eta: 1 } });
		expect(r.F_total).toBeCloseTo(3000, APPROX);
		expect(r.shieldingReductionPct).toBeCloseTo(0, APPROX);
	});

	it('shielding reduction percentage is computed', () => {
		// 4 frames, η=0.5: F_total = (1 + 0.5 + 0.25 + 0.125) * 750 = 1406.25
		// unshielded = 4 * 750 = 3000; reduction = 1 - 1406.25/3000 = 53.125%
		const r = memberForce({ ...base, frames: { count: 4, eta: 0.5 } });
		expect(r.F_total).toBeCloseTo(1406.25, APPROX);
		expect(r.shieldingReductionPct).toBeCloseTo(53.125, APPROX);
	});

	it('frames > 8: marginal force on 8th frame applies to all subsequent frames (§5.5)', () => {
		// η=0.5: cumulative at n=7 = (1-0.5^7)/(1-0.5) = 1.984375 * 750 = 1488.281
		//        cumulative at n=8 = (1-0.5^8)/(1-0.5) = 1.9921875 * 750 = 1494.141
		// marginal on 8th frame = 1494.141 - 1488.281 = 5.859
		// For frame 9: 1494.141 + 5.859 = 1500.000
		// For frame 10: 1500 + 5.859 = 1505.859
		const r = memberForce({ ...base, frames: { count: 10, eta: 0.5 } });
		expect(r.frameForces!.length).toBe(10);
		expect(r.frameForces![7]).toBeCloseTo(1494.140625, 4);
		expect(r.frameForces![8]).toBeCloseTo(1500.0, 4);
		expect(r.frameForces![9]).toBeCloseTo(1505.859375, 4);
	});

	it('rejects non-integer frame count', () => {
		expect(() => memberForce({ ...base, frames: { count: 2.5, eta: 0.5 } })).toThrow();
		expect(() => memberForce({ ...base, frames: { count: 0, eta: 0.5 } })).toThrow();
	});

	it('rejects η out of [0,1]', () => {
		expect(() => memberForce({ ...base, frames: { count: 3, eta: -0.1 } })).toThrow();
		expect(() => memberForce({ ...base, frames: { count: 3, eta: 1.1 } })).toThrow();
	});

	it('combined inclined + shielding: shielding stacks on reduced perpendicular force', () => {
		// AS 5222 §5.5 + §5.6 combined. F_single = 750, α = 30° → F_base = 375.
		// 4 frames η=0.5 cumulative on F_base=375:
		//   F_1=375, F_2=375*1.5=562.5, F_3=375*1.75=656.25, F_4=375*1.875=703.125
		// shielding reduction = 1 - 703.125/(4*375) = 53.125%
		const r = memberForce({
			...base, inclinationDeg: 30, frames: { count: 4, eta: 0.5 }
		});
		expect(r.F_single).toBeCloseTo(750, APPROX);
		expect(r.F_inclined).toBeCloseTo(375, APPROX);
		const expected = [375, 562.5, 656.25, 703.125];
		expect(r.frameForces!.length).toBe(4);
		r.frameForces!.forEach((f, i) => expect(f).toBeCloseTo(expected[i], 4));
		expect(r.F_total).toBeCloseTo(703.125, APPROX);
		expect(r.shieldingReductionPct).toBeCloseTo(53.125, APPROX);
	});

	it('combined inclined + shielding: 90° gives same as un-inclined', () => {
		// sin(90°) = 1, so F_base = F_single, results match the un-inclined case.
		const inclined = memberForce({ ...base, inclinationDeg: 90, frames: { count: 4, eta: 0.5 } });
		const plain = memberForce({ ...base, frames: { count: 4, eta: 0.5 } });
		expect(inclined.F_total).toBeCloseTo(plain.F_total!, APPROX);
	});
});

describe('out-of-service speed profile (§6.3 eq 11)', () => {
	it('at z = 10 m, simplified form gives v(10) = f_rec * 1.4 * v_ref', () => {
		// (10/10)^0.14 + 0.4 = 1.0 + 0.4 = 1.4
		// R=50 → f_rec = 1.0 → v(10) = 1.4 * v_ref
		expect(speedAtHeight(30, 50, 10)).toBeCloseTo(1.4 * 30, APPROX);
		expect(speedAtHeight(40, 50, 10)).toBeCloseTo(1.4 * 40, APPROX);
	});

	it('at z = 0, contributes only the gust offset 0.4 * v_ref * f_rec', () => {
		expect(speedAtHeight(30, 50, 0)).toBeCloseTo(0.4 * 30, APPROX);
	});

	it('R = 5: f_rec = 0.815 reduces wind speed', () => {
		// v(10, R=5) = 0.815 * 1.4 * v_ref = 1.141 * v_ref
		expect(speedAtHeight(30, 5, 10)).toBeCloseTo(0.815 * 1.4 * 30, APPROX);
	});

	it('wind speed increases monotonically with height', () => {
		const heights = [0, 5, 10, 20, 50, 100];
		const speeds = heights.map(h => speedAtHeight(40, 50, h));
		for (let i = 1; i < speeds.length; i++) {
			expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
		}
	});

	it('F_REC_LOOKUP exact values per AS 5222 §6.3', () => {
		expect(F_REC_LOOKUP[5]).toBe(0.815);
		expect(F_REC_LOOKUP[10]).toBe(0.873);
		expect(F_REC_LOOKUP[20]).toBe(0.946);
		expect(F_REC_LOOKUP[50]).toBe(1.0);
	});
});

describe('out-of-service dynamic pressure (§6.3 eq 9)', () => {
	it('q = 0.625 * v^2', () => {
		expect(dynamicPressure(40)).toBeCloseTo(1000, APPROX);
		expect(dynamicPressure(20)).toBeCloseTo(250, APPROX);
	});
});

describe('out-of-service full calc', () => {
	it('worked example: v_ref=40 m/s, R=50, z=10 → v(z)=56, q=1960', () => {
		const r = outOfService({ v_ref: 40, R: 50, z: 10 });
		expect(r.v_z).toBeCloseTo(56, APPROX);
		expect(r.p_z).toBeCloseTo(0.625 * 56 * 56, APPROX); // 1960
		expect(r.f_rec).toBe(1.0);
		expect(r.profile.length).toBeGreaterThan(0);
	});

	it('worked example: includes inclined member', () => {
		// θ=90° → v_z_inclined == v_z, p_z_inclined == p_z
		const r = outOfService({ v_ref: 40, R: 50, z: 10, thetaDeg: 90 });
		expect(r.v_z_inclined).toBeCloseTo(r.v_z, APPROX);
		expect(r.p_z_inclined).toBeCloseTo(r.p_z, APPROX);
	});

	it('inclined θ=30° halves v(z)', () => {
		const r = outOfService({ v_ref: 40, R: 50, z: 10, thetaDeg: 30 });
		expect(r.v_z_inclined).toBeCloseTo(r.v_z * 0.5, APPROX);
		expect(r.p_z_inclined).toBeCloseTo(r.p_z * 0.25, APPROX);
	});

	it('with A and C_f gives force', () => {
		// v(z=10)=56, q=1960; A=3, C_f=1.5 → F = 3 * 1960 * 1.5 = 8820 N
		const r = outOfService({ v_ref: 40, R: 50, z: 10, A: 3, C_f: 1.5 });
		expect(r.F).toBeCloseTo(8820, APPROX);
	});

	it('inclined force uses p_z_inclined', () => {
		// θ=30° → p_z_inclined = 1960 * 0.25 = 490; F = 3 * 490 * 1.5 = 2205
		const r = outOfService({ v_ref: 40, R: 50, z: 10, thetaDeg: 30, A: 3, C_f: 1.5 });
		expect(r.F).toBeCloseTo(2205, APPROX);
	});

	it('rejects invalid inputs', () => {
		expect(() => outOfService({ v_ref: -1, R: 50, z: 10 })).toThrow();
		expect(() => outOfService({ v_ref: 40, R: 50, z: -1 })).toThrow();
		expect(() => outOfService({ v_ref: 40, R: 50, z: 10, thetaDeg: 100 })).toThrow();
	});
});
