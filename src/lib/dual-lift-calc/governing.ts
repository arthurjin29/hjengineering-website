/**
 * Which load governs, per crane. Mirrors `compute_factored_load` in
 * py/dual_lift/mode1.py in the dual-lift-calculator repo — keep the two in step.
 *
 * Two rules:
 *
 *   generic (no acknowledgement)   max(×1.20 baseline, engineering lift)
 *   certified engineered lift      the engineering lift, which MAY sit below
 *                                  the ×1.20 baseline
 *
 * AS 2550.1 §6.28.3 sets a MINIMUM, so the generic answer must never report
 * less than the engineering lift where the geometry computes higher. Relief
 * below the baseline is what the acknowledgement buys, which is why it is a
 * claim of competence rather than a reporting preference.
 */
export function governingLoad(
	baseline_628_3_kg: number,
	engineeringLift_kg: number,
	designedLiftAck: boolean
): number {
	return designedLiftAck
		? engineeringLift_kg
		: Math.max(baseline_628_3_kg, engineeringLift_kg);
}

/** Label for the governing row, naming which rule is in force. */
export function governingBasis(designedLiftAck: boolean): string {
	return designedLiftAck
		? 'certified engineered lift — the computed factor governs'
		: 'generic — max(×1.20, computed)';
}
