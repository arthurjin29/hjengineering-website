import type { Mode1Inputs } from './types';

export function computeStatic(
  inputs: Pick<Mode1Inputs, 'M_kg' | 'a1_m' | 'a2_m'>
): { F1_kg: number; F2_kg: number } {
  const { M_kg, a1_m, a2_m } = inputs;
  const span = a1_m + a2_m;
  return {
    F1_kg: M_kg * a2_m / span,
    F2_kg: M_kg * a1_m / span
  };
}

const DEG = Math.PI / 180;

export function computeDynamic(
  inputs: Pick<Mode1Inputs, 'M_kg' | 'h_m' | 'a1_m' | 'a2_m' | 'alpha_deg'>
): {
  F1_static_kg: number;
  F2_static_kg: number;
  F1_max_kg: number;
  F2_max_kg: number;
  pct_rc: number;
} {
  const { M_kg, h_m, a1_m, a2_m, alpha_deg } = inputs;
  const span = a1_m + a2_m;
  const a_min = Math.min(a1_m, a2_m);
  const tan_a = Math.tan(alpha_deg * DEG);
  const shift = h_m * tan_a;

  return {
    F1_static_kg: M_kg * a2_m / span,
    F2_static_kg: M_kg * a1_m / span,
    F1_max_kg: M_kg * (a2_m + shift) / span,
    F2_max_kg: M_kg * (a1_m + shift) / span,
    pct_rc: 100 / (1 + (h_m / a_min) * tan_a)
  };
}

/**
 * Sequential set-down landing crane loads.
 *
 * Pure ICSA N002 Annex 2 form is recovered when alpha_deg = 0 (default), giving
 *   F1' = M · X_s2 / (a1 + X_s2)    (when S2 touches first)
 *   F2' = M · X_s1 / (a2 + X_s1)    (when S1 touches first)
 *
 * With alpha_deg > 0 we account for the COG horizontal swing (h · tan α) caused by
 * asynchronous descent BEFORE either support touches — practical augmentation since
 * real-world landings are almost always asymmetric. The shift is added to the
 * worst-case direction (toward the still-elevated crane), increasing its share.
 */
export function computeLanding(
  inputs: Pick<Mode1Inputs, 'M_kg' | 'a1_m' | 'a2_m'> & {
    X_s1_m: number; X_s2_m: number;
    h_m?: number; alpha_deg?: number;
  }
): {
  S2_first: { F1_prime_kg: number; S2_prime_kg: number };
  S1_first: { F2_prime_kg: number; S1_prime_kg: number };
} {
  const { M_kg, a1_m, a2_m, X_s1_m, X_s2_m, h_m = 0, alpha_deg = 0 } = inputs;
  const shift = h_m * Math.tan(alpha_deg * Math.PI / 180);
  const F1_prime = M_kg * (X_s2_m + shift) / (a1_m + X_s2_m);
  const F2_prime = M_kg * (X_s1_m + shift) / (a2_m + X_s1_m);
  return {
    S2_first: { F1_prime_kg: F1_prime, S2_prime_kg: M_kg - F1_prime },
    S1_first: { F2_prime_kg: F2_prime, S1_prime_kg: M_kg - F2_prime }
  };
}
