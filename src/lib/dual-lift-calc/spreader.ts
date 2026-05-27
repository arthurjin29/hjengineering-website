const DEG = Math.PI / 180;

export function spreaderShare(inputs: {
  M_kg: number; hs_m: number; as_m: number; alpha_deg: number;
}): { F1_kg: number; F2_kg: number } {
  const { M_kg, hs_m, as_m, alpha_deg } = inputs;
  const tan_a = Math.tan(alpha_deg * DEG);
  const shift = hs_m * tan_a;
  const half = as_m / 2;
  return {
    F1_kg: M_kg * (half + shift) / as_m,
    F2_kg: M_kg * (half - shift) / as_m
  };
}
