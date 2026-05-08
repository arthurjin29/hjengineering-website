/**
 * Wind pressure — AS 5222:2021 §4
 *
 * p = 0.5 * rho * v_s^2  (eq 1)
 * With rho = 1.225 kg/m^3 (constant per the standard for SI use):
 * p = 0.625 * v_s^2  (eq 2)
 */

import type { InServiceCategory, PressureResult } from './types';
import { IN_SERVICE_PRESETS } from './types';

const AIR_DENSITY_FACTOR = 0.625; // 0.5 * 1.225

export function pressureFromSpeed(v_s: number): number {
	if (!isFinite(v_s) || v_s < 0) throw new Error(`Invalid wind speed: ${v_s}`);
	return AIR_DENSITY_FACTOR * v_s * v_s;
}

export function manualPressure(v_s: number): PressureResult {
	return { v_s, p: pressureFromSpeed(v_s), source: 'manual' };
}

export function presetPressure(category: InServiceCategory): PressureResult {
	const preset = IN_SERVICE_PRESETS[category];
	if (!preset) throw new Error(`Unknown in-service category: ${category}`);
	return { v_s: preset.v_s, p: preset.p, source: 'preset', preset: category };
}
