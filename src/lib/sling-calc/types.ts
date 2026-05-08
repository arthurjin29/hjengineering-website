export interface Point3D {
	x: number;
	y: number;
	z: number;
}

export interface LabeledPoint extends Point3D {
	label: string;
}

export interface Sling {
	id: number;
	from: LabeledPoint;
	to: LabeledPoint;
	length: number;
	horizontalDist: number;
	verticalDist: number;
	angleDegFromHoriz: number;
	angleDegFromVert: number;
	tension: number;
	verticalLoad: number;
	isCritical: boolean;
	governsHookHeight: boolean;
}

export interface Beam {
	name: string;
	endA: Point3D;
	endB: Point3D;
	length: number;
	pickupPoint: Point3D | null;
}

export interface Tier {
	name: string;
	slings: Sling[];
}

export interface Warnings {
	cogOutsidePolygon: boolean;
	negativeTension: boolean;
	topSlingAngleLow: boolean;
	liftBeamBendingNotChecked: boolean;
	bottomAngleLow?: boolean;
	nearHorizontalBottom?: boolean;
	bottomSlingBelowMin?: boolean;
}

export interface SlackLegScenario {
	slackSlingId: number;
	tensions: number[];
	maxTension: number;
	criticalSlingId: number;
	infeasible: boolean;
}

export interface SlackLegApplicable {
	applicable: true;
	toleranceMm: number;
	baseMaxTension: number;
	scenarios: SlackLegScenario[];
	worstCase: {
		slackSlingId: number;
		criticalSlingId: number;
		maxTension: number;
		percentOverBase: number;
	};
}

export interface SlackLegNotApplicable {
	applicable: false;
	toleranceMm?: number;
	reason: string;
}

export type SlackLegAnalysis = SlackLegApplicable | SlackLegNotApplicable;

export interface CalcResult {
	configType: string;
	hook: Point3D;
	hookHeight: number;
	headroom: number;
	heightAboveCOG: number;
	totalLoad: number;
	minAngleDeg: number;
	criticalSling: { tier: string; id: number };
	tiers: Tier[];
	beams: Beam[];
	intermediatePoints: LabeledPoint[];
	slackLegAnalysis: SlackLegAnalysis;
	warnings: Warnings;
}

export interface SharedInputs {
	liftingPoints: Point3D[];
	cog: Point3D;
	minAngleDeg: number;
	totalLoad: number;
	toleranceMm?: number;
}

export type ConfigType =
	| 'direct'
	| 'spreader-beam'
	| 'stinger'
	| 'lifting-beam'
	| 'double-parallel'
	| 'double-cascade';

export interface ConfigInputs {
	beamLength?: number;
	orientation?: 'lengthwise' | 'widthwise';
	topSlingLength?: number;
	beamLengthA?: number;
	beamLengthB?: number;
	orientationA?: string;
	orientationB?: string;
	bottomSlingLen?: number;
	masterLength?: number;
	slaveLengthA?: number;
	slaveLengthB?: number;
	pairing?: { groupA: number[]; groupB: number[] };
}

export const CONFIG_LABELS: Record<ConfigType, string> = {
	'direct': '4-Leg Direct',
	'spreader-beam': 'Spreader Beam',
	'stinger': 'Stinger / Equaliser',
	'lifting-beam': 'Lifting Beam',
	'double-parallel': 'Double Spreader (Parallel)',
	'double-cascade': 'Double Spreader (Cascade)'
};
