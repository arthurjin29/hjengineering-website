import type { Mode1Inputs } from './types';

export function computeStatic(
  inputs: Pick<Mode1Inputs, 'M_kg' | 'a1_m' | 'a2_m'>
): { F1_kg: number; F2_kg: number } {
  const { M_kg, a1_m, a2_m } = inputs;
  assertGeometry({ M_kg, a1_m, a2_m });
  const span = a1_m + a2_m;
  return {
    F1_kg: M_kg * a2_m / span,
    F2_kg: M_kg * a1_m / span
  };
}

const DEG = Math.PI / 180;

/** Exclusive — tan(alpha) diverges at 90 deg. */
export const ALPHA_MAX_DEG = 90;

/**
 * Format a value for an error message without assuming it is a number.
 *
 * Error constructors are reached precisely BECAUSE a value is bad, so they must
 * never assume it is formattable. A cleared numeric input binds to `null`, and
 * `null.toFixed(3)` threw inside a $derived - wedging the reactive graph and
 * leaving stale results on screen looking live.
 */
function fmt(v: unknown, digits = 3): string {
  if (typeof v === 'number' && Number.isFinite(v)) return v.toFixed(digits);
  if (v === null || v === undefined || v === '') return '(blank)';
  return String(v);
}

/**
 * Base: a geometry this method cannot be applied to.
 *
 * These are refusals, not results. Each corresponds to a configuration where
 * the model's output would be arithmetically defined but physically
 * meaningless, so returning a number would be worse than returning nothing.
 */
export class LiftGeometryError extends Error {
  readonly code: string = 'invalid_geometry';
}

/**
 * A lift point coincides with the CoG (a <= 0), or the arms are not finite.
 *
 * The lever rule divides by the arm, so a zero arm puts one crane's static
 * share at zero and its factor at Infinity. Python raised ZeroDivisionError
 * here; JavaScript silently produced Infinity and rendered 'NaN t'.
 */
export class DegenerateArmError extends LiftGeometryError {
  readonly code = 'degenerate_arm';
  readonly a1_m: unknown;
  readonly a2_m: unknown;
  constructor(a1_m: unknown, a2_m: unknown) {
    super(
      `Lever arms must both be greater than zero (a₁ = ${fmt(a1_m)} m, ` +
      `a₂ = ${fmt(a2_m)} m). A lift point coincident with the centre of ` +
      `gravity carries the whole load and leaves the other crane with no share, ` +
      `so no load split can be computed. Separate the lift points from the CoG ` +
      `and re-check.`
    );
    this.name = 'DegenerateArmError';
    this.a1_m = a1_m;
    this.a2_m = a2_m;
  }
}

/**
 * The inclination tolerance is negative or beyond the model's domain.
 *
 * A NEGATIVE alpha is the dangerous one. It makes shift = h·tan(alpha)
 * negative, so both worst-case shares fall BELOW static, the g_i = max(1, .)
 * floor absorbs the result, and the model reports delta_geometric = 0 with
 * pct_rc above 100% — the same silently-zero allowance the stability guard
 * exists to prevent, reached through a different input. alpha is a tolerance
 * magnitude: the worst case is already evaluated in both tilt directions.
 */
export class InvalidToleranceError extends LiftGeometryError {
  readonly code = 'invalid_tolerance';
  readonly alpha_deg: unknown;
  constructor(alpha_deg: unknown) {
    super(
      typeof alpha_deg === 'number' && alpha_deg < 0
        ? `Inclination tolerance must not be negative (α = ${fmt(alpha_deg)}°). ` +
          `It is a tolerance magnitude — the worst case is already evaluated in both ` +
          `tilt directions — and a negative value silently drives the computed ` +
          `allowance to zero.`
        : `Inclination tolerance is outside the model's domain ` +
          `(α = ${fmt(alpha_deg)}°, must be below ${ALPHA_MAX_DEG}°).`
    );
    this.name = 'InvalidToleranceError';
    this.alpha_deg = alpha_deg;
  }
}

/**
 * Mass is missing, non-finite, or not positive.
 *
 * A blank or zero mass rendered as "0.00 t" results rather than as a refusal,
 * and a negative mass produced negative shares.
 */
export class InvalidMassError extends LiftGeometryError {
  readonly code = 'invalid_mass';
  readonly M_kg: unknown;
  constructor(M_kg: unknown) {
    super(
      `Load mass must be a positive number (M = ${fmt(M_kg)} kg). A blank, zero ` +
      `or negative mass has no load share to distribute.`
    );
    this.name = 'InvalidMassError';
    this.M_kg = M_kg;
  }
}

/**
 * A CoG-to-support distance is negative or non-finite.
 *
 * X_s appears in the set-down denominators (a1 + X_s2), (a2 + X_s1). A negative
 * X_s can drive either to zero or through it: Python raised ZeroDivisionError,
 * JavaScript returned +/-Infinity, and just past zero the shares flip sign.
 */
export class InvalidSupportError extends LiftGeometryError {
  readonly code = 'invalid_support';
  constructor(X_s1_m: unknown, X_s2_m: unknown) {
    super(
      `CoG-to-support distances must be finite and not negative ` +
      `(X_s1 = ${fmt(X_s1_m)} m, X_s2 = ${fmt(X_s2_m)} m). They are distances ` +
      `from the centre of gravity to the final bearing points.`
    );
    this.name = 'InvalidSupportError';
  }
}

/**
 * Both lift points (or both supports) lie on the same side of the CoG.
 *
 * a1 and a2 are MAGNITUDES, so each arm's sign is lost before any guard can see
 * it. Two lift points on the same side still yield positive arms and a
 * plausible split, but the true equilibrium puts one crane in tension: the load
 * is not straddled and it will rotate, or a sling will go slack. Only callers
 * holding x-coordinates can detect this.
 */
export class SameSideLiftPointsError extends LiftGeometryError {
  readonly code = 'lift_points_same_side';
  constructor(x_cog: unknown, xa: unknown, xb: unknown, what = 'lift points') {
    super(
      `The ${what} must straddle the centre of gravity (x_cog = ${fmt(x_cog)} m, ` +
      `points at ${fmt(xa)} m and ${fmt(xb)} m). With both on the same side the ` +
      `load is not supported between them: equilibrium requires one crane to ` +
      `pull down, so the computed split is fictitious.`
    );
    this.name = 'SameSideLiftPointsError';
  }
}

/**
 * The lift geometry is not a stable suspension.
 *
 * `h` is the vertical drop from the lift-point (suspension) plane to the CoG.
 * A suspended load is stable only where that plane sits ABOVE the CoG. At
 * h <= 0 the load is not in equilibrium at the modelled attitude — it rotates
 * until the CoG hangs below the pivot — so the inclination tolerance alpha is
 * not a bounded quantity and no dynamic allowance can be derived from it.
 *
 * Must not be silently clamped. Before this guard the model returned
 * delta_geometric = 0 for these geometries (the max(1, .) floor absorbing the
 * negative shift) together with pct_rc above 100% — the most reassuring
 * possible output for the least safe geometry.
 *
 * Provenance: this is the classical stability condition for a suspended rigid
 * body (the CoG must hang below the point of suspension for the equilibrium to
 * be stable) — first principles, not a clause. AS 2550.1, AS 4991 and ICSA N002
 * all assume a stable suspension without stating it as an equation, so no
 * clause can be cited for it.
 */
export class UnstableRiggingError extends LiftGeometryError {
  readonly code = 'unstable_rigging';
  readonly h_m: unknown;
  constructor(h_m: unknown) {
    super(
      `Lift points are ${h_m === 0 ? 'level with' : 'below'} the centre of gravity ` +
      `(h = ${fmt(h_m)} m). The suspension point is at or below the CoG, so the ` +
      `rig is unstable and this method does not apply. Raise the lift points above ` +
      `the CoG, or rig to a spreader/apex above it, and re-check.`
    );
    this.name = 'UnstableRiggingError';
    this.h_m = h_m;
  }
}

/** True where the suspension plane sits above the CoG. */
export function isRiggingStable(h_m: unknown): boolean {
  return typeof h_m === 'number' && Number.isFinite(h_m) && h_m > 0;
}

/**
 * Return the first geometry problem with these inputs, or null.
 *
 * Non-raising, so the UI can ask "is this valid, and why not" without
 * exception handling. `assertGeometry` throws whatever this returns. Fields
 * left undefined are not checked — callers pass only what they use.
 */
export function checkGeometry(g: {
  M_kg?: number | null; a1_m?: number | null; a2_m?: number | null;
  alpha_deg?: number | null; X_s1_m?: number | null; X_s2_m?: number | null;
  h_m?: number | null;
}): LiftGeometryError | null {
  const num = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);

  // `undefined` means "not supplied, do not check". `null` means "supplied but
  // not a number" - a cleared input - and must be refused, not skipped.
  if (g.M_kg !== undefined) {
    if (!num(g.M_kg) || g.M_kg <= 0) return new InvalidMassError(g.M_kg);
  }
  if (g.a1_m !== undefined || g.a2_m !== undefined) {
    const a1 = g.a1_m, a2 = g.a2_m;
    if (!num(a1) || !num(a2) || a1 <= 0 || a2 <= 0) {
      return new DegenerateArmError(a1, a2);
    }
  }
  if (g.alpha_deg !== undefined) {
    const a = g.alpha_deg;
    if (!num(a) || a < 0 || a >= ALPHA_MAX_DEG) {
      return new InvalidToleranceError(a);
    }
  }
  if (g.X_s1_m !== undefined || g.X_s2_m !== undefined) {
    const s1 = g.X_s1_m, s2 = g.X_s2_m;
    if (!num(s1) || !num(s2) || s1 < 0 || s2 < 0) {
      return new InvalidSupportError(s1, s2);
    }
  }
  if (g.h_m !== undefined && !isRiggingStable(g.h_m)) {
    return new UnstableRiggingError(g.h_m);
  }
  return null;
}

/**
 * Return SameSideLiftPointsError if x_cog is not strictly between xa and xb.
 *
 * Separate from checkGeometry because it needs x-coordinates, which the a1/a2
 * form has already collapsed to magnitudes.
 */
export function checkStraddle(
  x_cog: unknown, xa: unknown, xb: unknown, what = 'lift points'
): SameSideLiftPointsError | null {
  const num = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);
  if (!num(x_cog) || !num(xa) || !num(xb)) {
    return new SameSideLiftPointsError(x_cog, xa, xb, what);
  }
  const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
  return lo < x_cog && x_cog < hi
    ? null
    : new SameSideLiftPointsError(x_cog, xa, xb, what);
}

function assertGeometry(g: Parameters<typeof checkGeometry>[0]): void {
  const err = checkGeometry(g);
  if (err) throw err;
}

/**
 * Per-crane raise-phase factor at a given tilt: F_max / F_static.
 *
 * Single source for the curve the chart draws and the ratio computeDynamic
 * reports — f1 = 1 + shift/a2, f2 = 1 + shift/a1, identical to dividing the
 * F_max expressions below by their static counterparts. Kept exported so the
 * chart does not re-implement the physics.
 */
export function raiseFactors(
  h_m: number, a1_m: number, a2_m: number, alpha_deg: number
): { f1: number; f2: number } {
  assertGeometry({ a1_m, a2_m, alpha_deg, h_m });
  const shift = h_m * Math.tan(alpha_deg * DEG);
  return { f1: 1 + shift / a2_m, f2: 1 + shift / a1_m };
}

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
  assertGeometry({ M_kg, a1_m, a2_m, alpha_deg, h_m });
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
  // Arms and tolerance are always checked. h is checked only where it is
  // actually used: at alpha = 0 the shift term vanishes and this reduces to the
  // pure ICSA N002 Annex 2 form, which is defined without any suspension height
  // at all (icsa_annex2_setdown.json carries no h_m).
  assertGeometry({ M_kg, a1_m, a2_m, alpha_deg, X_s1_m, X_s2_m,
                   ...(alpha_deg > 0 ? { h_m } : {}) });
  const shift = h_m * Math.tan(alpha_deg * Math.PI / 180);
  const F1_prime = M_kg * (X_s2_m + shift) / (a1_m + X_s2_m);
  const F2_prime = M_kg * (X_s1_m + shift) / (a2_m + X_s1_m);
  return {
    S2_first: { F1_prime_kg: F1_prime, S2_prime_kg: M_kg - F1_prime },
    S1_first: { F2_prime_kg: F2_prime, S1_prime_kg: M_kg - F2_prime }
  };
}
