export interface Service {
	slug: string;
	name: string;
	tagline: string;
	description: string[];
	deliverables: string[];
	standards: string[];
}

export const services: Service[] = [
	{
		slug: 'lifting-crane-planning',
		name: 'Lifting & Crane Planning',
		tagline: 'Crane lift plans, outrigger loads, lifting studies, complex lift support.',
		description: [
			'HJ Engineering provides comprehensive crane lift planning services for construction and industrial projects across Australia. From single-crane lifts to complex multi-crane tandem operations, we deliver engineered lift plans that meet regulatory requirements and site-specific constraints.',
			'Our lift planning covers crane selection verification, outrigger load calculations, ground bearing pressure assessment, and detailed rigging design. We work directly with crane operators and site teams to ensure plans are practical and executable.',
			'For complex lifts involving multiple cranes, engineered lifts near live services, or lifts requiring specialist rigging arrangements, we provide independent engineering review and PE-certified documentation.'
		],
		deliverables: [
			'Crane lift plans with load charts and radius verification',
			'Outrigger load calculations and ground bearing assessment',
			'Rigging design — sling selection, shackle sizing, spreader beams',
			'Lifting studies for complex or tandem crane operations',
			'Independent engineering review and PE sign-off',
			'Site-specific risk assessment and engineering controls'
		],
		standards: ['AS 3775', 'AS 2550', 'AS 1418', 'AS 4100']
	},
	{
		slug: 'temporary-works',
		name: 'Temporary Works',
		tagline: 'Walkway checks, access platforms, temporary support, stability analysis.',
		description: [
			'Temporary works engineering covers all temporary structures required during construction — from access platforms and walkways to falsework, formwork supports, and temporary bracing systems.',
			'We provide design verification, independent checking, and PE-certified documentation for temporary structures. Our approach focuses on practical, buildable solutions that meet Australian Standards while minimising on-site complexity.',
			'Whether you need a walkway check for a scaffold platform, stability analysis for a temporary support structure, or a full temporary works design package, we deliver clear engineering documentation your site team can work from.'
		],
		deliverables: [
			'Temporary works design and verification',
			'Walkway and platform structural checks',
			'Falsework and formwork support design',
			'Temporary bracing and stability analysis',
			'PE-certified design documentation',
			'Construction sequence engineering'
		],
		standards: ['AS 4100', 'AS 1170', 'AS 3610', 'AS/NZS 1576']
	},
	{
		slug: 'ground-bogmat-assessment',
		name: 'Ground & Bogmat Assessment',
		tagline: 'Ground bearing pressure, bogmat verification, load spread analysis.',
		description: [
			'Ground conditions are critical for crane operations. Inadequate ground preparation is one of the most common causes of crane incidents. We provide engineering analysis to verify that ground conditions and load-spreading arrangements are adequate for the planned loads.',
			'Our bogmat and outrigger pad assessments cover steel and timber crane mats, engineered outrigger pads, and ground bearing capacity verification. We calculate load spread through mats and pads to determine the actual bearing pressure on the underlying soil.',
			'For sites with uncertain ground conditions, we work with geotechnical data to verify bearing capacity and recommend appropriate load-spreading measures. All assessments are PE-certified and reference the relevant Australian Standards.'
		],
		deliverables: [
			'Ground bearing pressure calculations',
			'Bogmat and crane mat verification',
			'Outrigger pad load spread analysis',
			'Load distribution through layered mat systems',
			'Ground improvement recommendations',
			'PE-certified ground assessment reports'
		],
		standards: ['AS 4100', 'AS 1170', 'AS 2550']
	},
	{
		slug: 'risk-safety-engineering',
		name: 'Risk & Safety Engineering',
		tagline: 'Hazard ID, risk assessment, engineering controls, safety reviews.',
		description: [
			'Effective risk management in crane and lifting operations requires engineering-led hazard identification and control measures. We provide structured risk assessments that go beyond generic checklists to address the specific engineering risks of each operation.',
			'Our risk engineering services cover pre-lift hazard identification, engineering control design, safety review of lifting procedures, and independent safety assessments for complex or high-risk operations.',
			'We integrate risk assessment into every engineering deliverable — lift plans, temporary works designs, and ground assessments all include operation-specific risk considerations and engineering controls.'
		],
		deliverables: [
			'Hazard identification and risk assessment',
			'Engineering control design and specification',
			'Lift procedure safety reviews',
			'Independent safety assessments for complex operations',
			'SWMS engineering input',
			'Incident investigation and engineering analysis'
		],
		standards: ['AS/NZS ISO 31000', 'AS 2550', 'AS 3775']
	}
];

export function getServiceBySlug(slug: string): Service | undefined {
	return services.find((s) => s.slug === slug);
}
