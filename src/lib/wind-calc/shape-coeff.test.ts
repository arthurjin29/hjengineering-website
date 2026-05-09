/**
 * Shape coefficient calculator tests — bounded to first-principles
 * aerodynamics anchors (Hoerner plate data, Reynolds drag crisis,
 * sharp-edge bluff-body curves).
 */

import { describe, it, expect } from 'vitest';
import {
	flatPlate,
	cylinder,
	rectangularBox,
	lattice
} from './shape-coeff';

describe('flat plate (Hoerner curve)', () => {
	it('square plate λ=1 gives C_f ≈ 1.10', () => {
		const r = flatPlate({ length: 2, breadth: 2 });
		expect(r.aspectRatio).toBe(1);
		expect(r.C_f).toBeCloseTo(1.1, 3);
	});

	it('long plate λ=10 gives C_f ≈ 1.30', () => {
		const r = flatPlate({ length: 10, breadth: 1 });
		expect(r.aspectRatio).toBe(10);
		expect(r.C_f).toBeCloseTo(1.3, 3);
	});

	it('very long plate λ≥100 caps at C_f = 2.0 (2D limit)', () => {
		const r = flatPlate({ length: 200, breadth: 1 });
		expect(r.C_f).toBeCloseTo(2.0, 3);
	});

	it('rejects non-positive dimensions', () => {
		expect(() => flatPlate({ length: 0, breadth: 1 })).toThrow();
		expect(() => flatPlate({ length: 1, breadth: -1 })).toThrow();
	});

	it('orientation independent — long-side / short-side normalised', () => {
		const a = flatPlate({ length: 5, breadth: 1 });
		const b = flatPlate({ length: 1, breadth: 5 });
		expect(a.C_f).toBe(b.C_f);
	});
});

describe('circular cylinder (Reynolds drag)', () => {
	it('subcritical (Re<2×10⁵): C_f = 1.2', () => {
		// d=0.05 m, v=5 m/s → Re ≈ 16,667 (subcritical)
		const r = cylinder({ diameter: 0.05, velocity: 5 });
		expect(r.regime).toBe('subcritical');
		expect(r.C_f).toBeCloseTo(1.2, 4);
	});

	it('supercritical smooth (Re>4×10⁵): C_f = 0.5', () => {
		// d=0.5 m, v=30 m/s → Re ≈ 10⁶
		const r = cylinder({ diameter: 0.5, velocity: 30 });
		expect(r.regime).toBe('supercritical');
		expect(r.C_f).toBeCloseTo(0.5, 4);
	});

	it('supercritical rough surface: C_f = 0.7', () => {
		const r = cylinder({ diameter: 0.5, velocity: 30, surface: 'rough' });
		expect(r.C_f).toBeCloseTo(0.7, 4);
	});

	it('drag-crisis transition at midpoint (Re=3×10⁵, smooth)', () => {
		// Choose d, v so that Re = 3e5 → midway between 2e5 and 4e5 → t=0.5
		// C_f = 1.2 - 0.5*(1.2-0.5) = 0.85
		const Re_target = 3e5;
		const v = 30;
		const d = (Re_target * 1.5e-5) / v;
		const r = cylinder({ diameter: d, velocity: v });
		expect(r.Re).toBeCloseTo(Re_target, 0);
		expect(r.regime).toBe('transition');
		expect(r.C_f).toBeCloseTo(0.85, 3);
	});

	it('Re = v·d / ν with ν = 1.5×10⁻⁵ m²/s', () => {
		const r = cylinder({ diameter: 1, velocity: 1.5 });
		expect(r.Re).toBeCloseTo(1e5, 0);
	});
});

describe('rectangular box / structural section', () => {
	it('square section d/b=1: C_f ≈ 2.0', () => {
		const r = rectangularBox({ depthAlongWind: 1, breadthAcrossWind: 1 });
		expect(r.C_f).toBeCloseTo(2.0, 3);
	});

	it('elongated d/b=4: C_f ≈ 1.0', () => {
		const r = rectangularBox({ depthAlongWind: 4, breadthAcrossWind: 1 });
		expect(r.C_f).toBeCloseTo(1.0, 3);
	});

	it('tall thin d/b=0.5: C_f ≈ 2.2', () => {
		const r = rectangularBox({ depthAlongWind: 0.5, breadthAcrossWind: 1 });
		expect(r.C_f).toBeCloseTo(2.2, 3);
	});

	it('clamps at extreme aspect ratios', () => {
		const tiny = rectangularBox({ depthAlongWind: 0.01, breadthAcrossWind: 1 });
		expect(tiny.C_f).toBeCloseTo(2.5, 3);
		const huge = rectangularBox({ depthAlongWind: 100, breadthAcrossWind: 1 });
		expect(huge.C_f).toBeCloseTo(0.85, 3);
	});
});

describe('lattice frame', () => {
	it('sharp-edge low solidity: C_f ≈ 1.7', () => {
		const r = lattice({ solidity: 0.0, member: 'sharp-edge' });
		expect(r.C_f).toBeCloseTo(1.7, 3);
	});

	it('sharp-edge high solidity: C_f rises toward 1.95', () => {
		const r = lattice({ solidity: 1.0, member: 'sharp-edge' });
		expect(r.C_f).toBeCloseTo(1.95, 3);
	});

	it('round-tube subcritical: C_f = 1.2', () => {
		const r = lattice({ solidity: 0.2, member: 'round-tube', velocity: 5, memberDiameter: 0.05 });
		expect(r.C_f).toBeCloseTo(1.2, 4);
		expect(r.regime).toBe('subcritical');
	});

	it('round-tube supercritical: C_f drops to 0.5 (smooth)', () => {
		const r = lattice({ solidity: 0.2, member: 'round-tube', velocity: 30, memberDiameter: 0.5 });
		expect(r.C_f).toBeCloseTo(0.5, 4);
		expect(r.regime).toBe('supercritical');
	});

	it('rejects solidity outside [0,1]', () => {
		expect(() => lattice({ solidity: -0.1, member: 'sharp-edge' })).toThrow();
		expect(() => lattice({ solidity: 1.1, member: 'sharp-edge' })).toThrow();
	});

	it('round-tube requires velocity and memberDiameter', () => {
		expect(() =>
			lattice({ solidity: 0.2, member: 'round-tube' })
		).toThrow();
		expect(() =>
			lattice({ solidity: 0.2, member: 'round-tube', velocity: 10 })
		).toThrow();
	});
});
