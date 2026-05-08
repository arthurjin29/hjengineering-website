/**
 * Wind load calculator — types
 * Implements AS 5222:2021 (ISO 4302:2016, MOD) — Cranes — Wind load assessment.
 *
 * Public-facing calculator. Coefficient tables (C_f shape coefficients,
 * η shielding factors, regional storm wind speeds) are NOT reproduced from
 * the standard; user supplies them with reference back to AS 5222 Tables.
 */

export type CalcMode = 'suspended-load' | 'member' | 'out-of-service';

export const MODE_LABELS: Record<CalcMode, string> = {
	'suspended-load': 'Suspended Load',
	'member': 'Crane Member',
	'out-of-service': 'Out-of-Service / Storm'
};

/** AS 5222 Table 1 — In-service design wind categories */
export type InServiceCategory = 'secured' | 'normal' | 'process';

export interface InServicePreset {
	category: InServiceCategory;
	label: string;
	description: string;
	v_s: number; // m/s
	p: number; // N/m^2
}

export const IN_SERVICE_PRESETS: Record<InServiceCategory, InServicePreset> = {
	'secured': {
		category: 'secured',
		label: 'Secured / light winds',
		description: 'Cranes ordinarily secured against wind, or designed for light winds only',
		v_s: 14,
		p: 125
	},
	'normal': {
		category: 'normal',
		label: 'Normal outdoor',
		description: 'All normal types of crane installed in the open',
		v_s: 20,
		p: 250
	},
	'process': {
		category: 'process',
		label: 'Process / continuous',
		description: 'Cranes in process applications that must continue working in high winds',
		v_s: 28.5,
		p: 500
	}
};

export interface PressureResult {
	v_s: number; // m/s
	p: number; // N/m^2
	source: 'preset' | 'manual';
	preset?: InServiceCategory;
}

/** Suspended load wind force — AS 5222 §5.2 */
export interface SuspendedLoadInput {
	pressure: PressureResult;
	c_H: number; // shape coefficient of suspended load
	A_H: number; // wind area of hoist load (m^2)
}

export interface SuspendedLoadResult {
	pressure: PressureResult;
	c_H: number;
	A_H: number;
	F_w: number; // wind force on suspended load, N
}

/** Single crane member — AS 5222 §5.3, §5.5 (multi-frame), §5.6 (inclined) */
export interface MemberInput {
	pressure: PressureResult;
	A: number; // characteristic (solid) area, m^2
	C_f: number; // shape coefficient (per AS 5222 Table 2)
	frames?: { count: number; eta: number }; // multi-frame shielding (η, n)
	inclinationDeg?: number; // angle α between member axis and wind direction (90° = perpendicular)
}

export interface MemberResult {
	pressure: PressureResult;
	A: number;
	C_f: number;
	F_single: number; // single-member force F = A*p*C_f, N
	F_inclined?: number; // F * sin(α), N
	frameForces?: number[]; // per-frame F_n for first 8, then constant
	F_total?: number; // sum across all frames, N
	shieldingReductionPct?: number; // (1 - F_total / (n * F_single)) * 100
}

/** Out-of-service / storm wind — AS 5222 §6 */
export type RecurrenceInterval = 5 | 10 | 20 | 50;

export const F_REC_LOOKUP: Record<RecurrenceInterval, number> = {
	5: 0.815,
	10: 0.873,
	20: 0.946,
	50: 1.0
};

/**
 * Out-of-service input — simplified form per AS 5222 §6.3 eq (11):
 *   v(z) = f_rec * [(z/10)^0.14 + 0.4] * v_ref
 * where v_ref is the 50-yr 10-min mean storm wind speed at 10m above flat
 * open country. Australian users: refer to AS 1418.1 for v_ref by region.
 */
export interface OutOfServiceInput {
	v_ref: number; // reference storm wind speed at 10 m, m/s (AU: per AS 1418.1)
	R: RecurrenceInterval; // design return period (years)
	z: number; // height at which speed/pressure is evaluated (m)
	thetaDeg?: number; // angle between wind and member axis (90° = perpendicular)
	A?: number; // optional: solid area (m^2) — gives force as well as pressure
	C_f?: number; // optional: shape coefficient — gives force as well as pressure
}

export interface OutOfServiceResult {
	v_ref: number;
	R: RecurrenceInterval;
	f_rec: number;
	z: number;
	v_z: number; // design wind speed at height z (m/s)
	p_z: number; // dynamic pressure at z (N/m^2)
	thetaDeg?: number;
	v_z_inclined?: number; // v(z) * sin(θ) — effective for inclined member
	p_z_inclined?: number; // 0.625 * v_z_inclined^2
	A?: number;
	C_f?: number;
	F?: number; // F = A * (p_z_inclined or p_z) * C_f, N
	profile: { z: number; v: number; p: number }[]; // wind profile for plotting
}
