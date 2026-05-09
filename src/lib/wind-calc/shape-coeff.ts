/**
 * Shape coefficient (drag coefficient C_f) calculators.
 *
 * Estimates from textbook aerodynamics — first-principles guidance for
 * lift-planning and structural feasibility. Final values for AS 5222
 * compliance should be checked against the standard's Table 2.
 *
 * References:
 *   - Hoerner, "Fluid-Dynamic Drag" (1965), §3 plates and §4 cylinders
 *   - Cook, "Designer's Guide to Wind Loading of Building Structures" §6
 *   - Eurocode EN 1991-1-4 §7 (force coefficients for elements)
 *   - Schlichting, "Boundary Layer Theory" Ch.1 (cylinder drag crisis)
 */

export type ShapeKind = 'flat-plate' | 'cylinder' | 'rectangular-box' | 'lattice';

const KINEMATIC_VISCOSITY_AIR = 1.5e-5; // m²/s at ~20 °C, 1 atm

function interpolate(x: number, points: readonly [number, number][]): number {
	if (x <= points[0][0]) return points[0][1];
	if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
	for (let i = 1; i < points.length; i++) {
		if (x <= points[i][0]) {
			const [x0, y0] = points[i - 1];
			const [x1, y1] = points[i];
			return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
		}
	}
	return points[points.length - 1][1];
}

function requireFinitePositive(label: string, v: unknown): number {
	if (typeof v !== 'number' || !isFinite(v) || v <= 0) {
		throw new Error(`${label} must be a positive finite number, got ${v}`);
	}
	return v;
}

// ─── 1. Flat plate / sheet panel ────────────────────────────────────────────
//
// Drag coefficient of a normal-incidence flat plate as a function of aspect
// ratio λ = length / breadth. Curve from Hoerner's plate-drag data:
// near-square ≈ 1.10, slender 2D plate → 2.0. Monotonic interpolation.

export interface FlatPlateInput {
	length: number; // longer side, m
	breadth: number; // shorter side, m
}

export interface FlatPlateResult {
	kind: 'flat-plate';
	aspectRatio: number;
	C_f: number;
}

const FLAT_PLATE_CURVE: readonly [number, number][] = [
	[1, 1.1],
	[2, 1.15],
	[5, 1.2],
	[10, 1.3],
	[20, 1.5],
	[40, 1.8],
	[100, 2.0]
];

export function flatPlate(input: FlatPlateInput): FlatPlateResult {
	const length = requireFinitePositive('length', input.length);
	const breadth = requireFinitePositive('breadth', input.breadth);
	const aspectRatio = Math.max(length, breadth) / Math.min(length, breadth);
	return { kind: 'flat-plate', aspectRatio, C_f: interpolate(aspectRatio, FLAT_PLATE_CURVE) };
}

// ─── 2. Circular cylinder ──────────────────────────────────────────────────
//
// Drag coefficient depends on Reynolds number and surface roughness.
// Subcritical (Re < ~2×10⁵): C_f ≈ 1.2.
// Drag crisis (Re ~ 2–4×10⁵): C_f drops sharply.
// Supercritical (Re > ~4×10⁵): smooth cylinder ≈ 0.5, rough ≈ 0.7.

export type CylinderSurface = 'smooth' | 'rough';

export interface CylinderInput {
	diameter: number; // m
	velocity: number; // m/s — for Re calculation
	surface?: CylinderSurface;
}

export interface CylinderResult {
	kind: 'cylinder';
	diameter: number;
	velocity: number;
	Re: number;
	regime: 'subcritical' | 'transition' | 'supercritical';
	surface: CylinderSurface;
	C_f: number;
}

export function cylinder(input: CylinderInput): CylinderResult {
	const diameter = requireFinitePositive('diameter', input.diameter);
	const velocity = requireFinitePositive('velocity', input.velocity);
	const surface: CylinderSurface = input.surface ?? 'smooth';

	const Re = (velocity * diameter) / KINEMATIC_VISCOSITY_AIR;
	const supercriticalCf = surface === 'smooth' ? 0.5 : 0.7;

	let C_f: number;
	let regime: CylinderResult['regime'];
	if (Re < 2e5) {
		C_f = 1.2;
		regime = 'subcritical';
	} else if (Re < 4e5) {
		const t = (Re - 2e5) / 2e5;
		C_f = 1.2 - t * (1.2 - supercriticalCf);
		regime = 'transition';
	} else {
		C_f = supercriticalCf;
		regime = 'supercritical';
	}
	return { kind: 'cylinder', diameter, velocity, Re, regime, surface, C_f };
}

// ─── 3. Rectangular box / structural section ───────────────────────────────
//
// Drag coefficient of a sharp-edged rectangular section, normal incidence.
// d = depth (along wind), b = breadth (across wind). At d/b = 1 (square)
// C_f ≈ 2.0; rises slightly for tall thin sections; drops as section
// elongates along wind (longer wake reattachment).

export interface RectBoxInput {
	depthAlongWind: number; // d, m
	breadthAcrossWind: number; // b, m
}

export interface RectBoxResult {
	kind: 'rectangular-box';
	depthOverBreadth: number;
	C_f: number;
}

const RECT_BOX_CURVE: readonly [number, number][] = [
	[0.1, 2.5],
	[0.5, 2.2],
	[1.0, 2.0],
	[2.0, 1.6],
	[4.0, 1.0],
	[10.0, 0.85]
];

export function rectangularBox(input: RectBoxInput): RectBoxResult {
	const d = requireFinitePositive('depthAlongWind', input.depthAlongWind);
	const b = requireFinitePositive('breadthAcrossWind', input.breadthAcrossWind);
	const ratio = d / b;
	return { kind: 'rectangular-box', depthOverBreadth: ratio, C_f: interpolate(ratio, RECT_BOX_CURVE) };
}

// ─── 4. Lattice frame ───────────────────────────────────────────────────────
//
// C_f referred to the solid (member) area of an open lattice frame.
// Sharp-edge members: roughly constant ≈ 1.7–1.8, with a mild rise as the
// frame approaches a solid plate at φ → 1.
// Round-tube members: subject to the same Reynolds-number regime as a
// single cylinder.

export type LatticeMember = 'sharp-edge' | 'round-tube';

export interface LatticeInput {
	solidity: number; // φ = solid silhouette / enclosed area, in [0, 1]
	member: LatticeMember;
	velocity?: number; // m/s — required for round-tube to compute Re
	memberDiameter?: number; // m — required for round-tube
}

export interface LatticeResult {
	kind: 'lattice';
	solidity: number;
	member: LatticeMember;
	Re?: number;
	regime?: CylinderResult['regime'];
	C_f: number;
}

export function lattice(input: LatticeInput): LatticeResult {
	if (typeof input.solidity !== 'number' || !isFinite(input.solidity)) {
		throw new Error(`solidity must be a finite number, got ${input.solidity}`);
	}
	if (input.solidity < 0 || input.solidity > 1) {
		throw new Error(`solidity must be in [0,1], got ${input.solidity}`);
	}

	if (input.member === 'sharp-edge') {
		// 1.7 baseline + linear correction toward 1.95 as φ → 1 (approaches
		// solid bluff body). Returned C_f is referred to solid area.
		const C_f = 1.7 + 0.25 * input.solidity;
		return { kind: 'lattice', solidity: input.solidity, member: 'sharp-edge', C_f };
	}

	const velocity = requireFinitePositive('velocity', input.velocity);
	const memberDiameter = requireFinitePositive('memberDiameter', input.memberDiameter);
	const cyl = cylinder({ diameter: memberDiameter, velocity, surface: 'smooth' });
	return {
		kind: 'lattice',
		solidity: input.solidity,
		member: 'round-tube',
		Re: cyl.Re,
		regime: cyl.regime,
		C_f: cyl.C_f
	};
}
