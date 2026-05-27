// Mode 1 — Dual Lift & Place
export interface Mode1Inputs {
  M_kg: number;
  h_m: number;
  a1_m: number;
  a2_m: number;
  alpha_deg: number;
  // optional landing
  X_s1_m?: number;
  X_s2_m?: number;
  // optional spreader
  use_spreader?: boolean;
  hs_m?: number;
  as_m?: number;
}

export interface Mode1Result {
  F1_static_kg: number;
  F2_static_kg: number;
  F1_max_kg: number;       // Crane 1 worst case (it's the high one)
  F2_max_kg: number;       // Crane 2 worst case (it's the high one)
  pct_rc: number;          // ICSA informational
  // optional landing scenarios
  landing?: {
    S2_first: { F1_prime_kg: number; S2_prime_kg: number };
    S1_first: { F2_prime_kg: number; S1_prime_kg: number };
  };
}

// Mode 2 — Rotation / Tailing
export interface Mode2Inputs {
  M_kg: number;
  X1_m: number;
  X2_m: number;
  Y1_m: number;
  theta_deg: number;
}

export interface Mode2Result {
  F_head_kg: number;
  F_tail_kg: number;
}

export interface Mode2Sweep {
  rows: Array<{ theta_deg: number; F_head_kg: number; F_tail_kg: number }>;
}
