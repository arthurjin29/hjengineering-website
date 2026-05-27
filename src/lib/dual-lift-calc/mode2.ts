import type { Mode2Inputs, Mode2Result } from './types';

const DEG = Math.PI / 180;

/**
 * Simplified 1-D tailing formula — assumes head pick, COG, and tail pick are
 * all on the load axis through COG, with tail lug offset Y1 perpendicular to
 * that axis. Equivalent to computeTailingGeneral with dx=X1, dy=0, dxt=X1+X2,
 * dyt=Y1. Retained for backward compatibility with the original XLSX test
 * vectors (validated against 27 rows).
 */
export function computeTailing(inputs: Mode2Inputs): Mode2Result {
  const { M_kg, X1_m, X2_m, Y1_m, theta_deg } = inputs;
  const c = Math.cos(theta_deg * DEG);
  const s = Math.sin(theta_deg * DEG);
  const denom = (X1_m + X2_m) * c + Y1_m * s;
  const F_tail = M_kg * X1_m * c / denom;
  const F_head = M_kg - F_tail;
  return {
    F_head_kg: F_head,
    F_tail_kg: F_tail
  };
}

/**
 * General 2-D tailing formula — static moment balance about the head pick,
 * with arbitrary lift-point positions in load-local coordinates. The load is
 * rotated by θ (CW from horizontal) about the head pick; both crane ropes
 * are vertical in world frame.
 *
 *   F_tail = M · (dx·cos θ + dy·sin θ) / (dxt·cos θ + dyt·sin θ)
 *
 * where:
 *   (dx, dy)   = head pick → COG in load-local frame
 *   (dxt, dyt) = head pick → tail-lug in load-local frame (includes Y1 offset)
 *
 * The numerator is the horizontal lever arm from head to COG in world frame
 * after rotation; the denominator is the horizontal lever arm from head to
 * the tail crane attachment. Returns F_tail < 0 when the requested θ is past
 * natural hang — i.e., the tail crane would have to push the load past
 * equilibrium, which a hoist rope cannot do.
 */
export function computeTailingGeneral(inputs: {
  M_kg: number;
  dx_m: number;     // head pick → COG, load-local x
  dy_m: number;     // head pick → COG, load-local y
  dxt_m: number;    // head pick → tail-lug, load-local x
  dyt_m: number;    // head pick → tail-lug, load-local y
  theta_deg: number;
}): Mode2Result {
  const { M_kg, dx_m, dy_m, dxt_m, dyt_m, theta_deg } = inputs;
  const c = Math.cos(theta_deg * DEG);
  const s = Math.sin(theta_deg * DEG);
  const num = dx_m * c + dy_m * s;
  const den = dxt_m * c + dyt_m * s;
  if (Math.abs(den) < 1e-9) {
    // Tail crane attachment passes directly above/below head pick — head
    // carries everything, tail unconstrained. Return F_tail = 0.
    return { F_head_kg: M_kg, F_tail_kg: 0 };
  }
  const F_tail = M_kg * num / den;
  const F_head = M_kg - F_tail;
  return { F_head_kg: F_head, F_tail_kg: F_tail };
}
