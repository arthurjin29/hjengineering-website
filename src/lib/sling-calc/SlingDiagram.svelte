<script lang="ts">
	import type { CalcResult, Point3D } from './types';

	interface Props {
		results: CalcResult;
		cog: Point3D;
		unit?: string;
	}

	let { results, cog, unit = 'm' }: Props = $props();

	const COLORS = {
		critical: '#e74c3c',
		normal: '#27ae60',
		lp: '#2980b9',
		cog: '#e67e22',
		hook: '#2c3e50',
		load: '#3498db',
		dim: '#8e44ad',
		grid: '#ddd',
		text: '#2c3e50',
		beam: '#c0392b',
		tierBottom: '#2980b9',
		tierTop: '#e67e22',
		tierMiddle: '#9b59b6',
		intermediate: '#8b5cf6'
	};

	const TIER_COLORS = [COLORS.tierBottom, COLORS.tierTop, COLORS.tierMiddle];

	function slingColor(tierIdx: number, isCritical: boolean): string {
		if (isCritical) return COLORS.critical;
		return TIER_COLORS[tierIdx] || COLORS.tierBottom;
	}

	interface FlatSling {
		from: Point3D & { label?: string };
		to: Point3D & { label?: string };
		tierIndex: number;
		isCritical: boolean;
		horizontalDist: number;
		length: number;
		angleDegFromHoriz: number;
		tension: number;
		id: number;
	}

	function collectAllSlings(r: CalcResult): FlatSling[] {
		const all: FlatSling[] = [];
		(r.tiers || []).forEach((tier, tIdx) => {
			(tier.slings || []).forEach(s => {
				all.push({ ...s, tierIndex: tIdx } as FlatSling);
			});
		});
		return all;
	}

	function getLiftingPoints(r: CalcResult) {
		const tiers = r.tiers || [];
		if (tiers.length === 0) return [];
		return tiers[0].slings.map(s => s.from);
	}

	// --- Plan View ---
	let planSvg = $derived.by(() => {
		const { hook } = results;
		const allSlings = collectAllSlings(results);
		const lps = getLiftingPoints(results);
		const beams = results.beams || [];
		const intermediatePoints = results.intermediatePoints || [];

		const allX = [...lps.map(p => p.x), cog.x, hook.x];
		const allY = [...lps.map(p => p.y), cog.y, hook.y];
		allSlings.forEach(s => { allX.push(s.from.x, s.to.x); allY.push(s.from.y, s.to.y); });
		beams.forEach(b => { allX.push(b.endA.x, b.endB.x); allY.push(b.endA.y, b.endB.y); });
		intermediatePoints.forEach(p => { allX.push(p.x); allY.push(p.y); });

		const minX = Math.min(...allX), maxX = Math.max(...allX);
		const minY = Math.min(...allY), maxY = Math.max(...allY);
		const rangeX = maxX - minX || 1;
		const rangeY = maxY - minY || 1;

		const pad = 60, w = 500, h = 400;
		const scale = Math.min((w - pad * 2) / rangeX, (h - pad * 2) / rangeY);
		const cx = w / 2, cy = h / 2;
		const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
		const tx = (x: number) => cx + (x - midX) * scale;
		const ty = (y: number) => cy - (y - midY) * scale;

		const parts: string[] = [];
		parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" class="w-full" style="max-width:${w}px">`);
		parts.push(`<text x="${w/2}" y="18" text-anchor="middle" font-size="14" font-weight="700" fill="${COLORS.text}">Plan View (Top Down)</text>`);

		if (lps.length >= 2) {
			parts.push(`<polygon points="${lps.map(p => `${tx(p.x)},${ty(p.y)}`).join(' ')}" fill="${COLORS.load}" fill-opacity="0.1" stroke="${COLORS.load}" stroke-width="1.5"/>`);
		}

		beams.forEach(b => {
			const x1 = tx(b.endA.x), y1 = ty(b.endA.y), x2 = tx(b.endB.x), y2 = ty(b.endB.y);
			parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.beam}" stroke-width="4"/>`);
			parts.push(`<circle cx="${x1}" cy="${y1}" r="4" fill="${COLORS.beam}" stroke="white" stroke-width="1"/>`);
			parts.push(`<circle cx="${x2}" cy="${y2}" r="4" fill="${COLORS.beam}" stroke="white" stroke-width="1"/>`);
		});

		intermediatePoints.forEach(p => {
			const px = tx(p.x), py = ty(p.y), sz = 4;
			parts.push(`<polygon points="${px},${py-sz} ${px+sz},${py+sz} ${px-sz},${py+sz}" fill="${COLORS.intermediate}" stroke="white" stroke-width="1"/>`);
		});

		const planLabelPos = [0.35, 0.45, 0.55, 0.65];
		allSlings.forEach((s, sIdx) => {
			const color = slingColor(s.tierIndex, s.isCritical);
			parts.push(`<line x1="${tx(s.to.x)}" y1="${ty(s.to.y)}" x2="${tx(s.from.x)}" y2="${ty(s.from.y)}" stroke="${color}" stroke-width="2" stroke-dasharray="6,3"/>`);
			if (s.horizontalDist != null) {
				const t = planLabelPos[sIdx % planLabelPos.length];
				const mx = tx(s.to.x) + (tx(s.from.x) - tx(s.to.x)) * t;
				const my = ty(s.to.y) + (ty(s.from.y) - ty(s.to.y)) * t;
				parts.push(`<text x="${mx}" y="${my-6}" text-anchor="middle" font-size="10" fill="${color}" font-weight="600">${s.horizontalDist.toFixed(2)}${unit}</text>`);
			}
		});

		lps.forEach((lp, i) => {
			parts.push(`<circle cx="${tx(lp.x)}" cy="${ty(lp.y)}" r="6" fill="${COLORS.lp}" stroke="white" stroke-width="1.5"/>`);
			parts.push(`<text x="${tx(lp.x)}" y="${ty(lp.y)-10}" text-anchor="middle" font-size="11" font-weight="700" fill="${COLORS.lp}">LP${i+1}</text>`);
			parts.push(`<text x="${tx(lp.x)}" y="${ty(lp.y)+18}" text-anchor="middle" font-size="9" fill="${COLORS.text}">(${lp.x}, ${lp.y})</text>`);
		});

		const cogSz = 6;
		parts.push(`<polygon points="${tx(cog.x)},${ty(cog.y)-cogSz} ${tx(cog.x)+cogSz},${ty(cog.y)} ${tx(cog.x)},${ty(cog.y)+cogSz} ${tx(cog.x)-cogSz},${ty(cog.y)}" fill="${COLORS.cog}" stroke="white" stroke-width="1"/>`);
		parts.push(`<text x="${tx(cog.x)}" y="${ty(cog.y)-10}" text-anchor="middle" font-size="10" font-weight="700" fill="${COLORS.cog}">COG</text>`);

		const hx = tx(hook.x), hy = ty(hook.y);
		parts.push(`<circle cx="${hx}" cy="${hy}" r="8" fill="none" stroke="${COLORS.hook}" stroke-width="1.5"/>`);
		parts.push(`<line x1="${hx-10}" y1="${hy}" x2="${hx+10}" y2="${hy}" stroke="${COLORS.hook}" stroke-width="1"/>`);
		parts.push(`<line x1="${hx}" y1="${hy-10}" x2="${hx}" y2="${hy+10}" stroke="${COLORS.hook}" stroke-width="1"/>`);

		let legendY = h - 42;
		parts.push(`<text x="10" y="${legendY}" font-size="9" fill="${COLORS.text}">Hook: crosshair | Dashed: horizontal projection</text>`);
		legendY += 14;
		parts.push(`<line x1="10" y1="${legendY}" x2="30" y2="${legendY}" stroke="${COLORS.critical}" stroke-width="2"/>`);
		parts.push(`<text x="34" y="${legendY+4}" font-size="9" fill="${COLORS.critical}">Critical</text>`);
		parts.push(`<line x1="80" y1="${legendY}" x2="100" y2="${legendY}" stroke="${COLORS.tierBottom}" stroke-width="2"/>`);
		parts.push(`<text x="104" y="${legendY+4}" font-size="9" fill="${COLORS.tierBottom}">Bottom</text>`);
		if ((results.tiers || []).length > 1) {
			parts.push(`<line x1="150" y1="${legendY}" x2="170" y2="${legendY}" stroke="${COLORS.tierTop}" stroke-width="2"/>`);
			parts.push(`<text x="174" y="${legendY+4}" font-size="9" fill="${COLORS.tierTop}">Top</text>`);
			if (beams.length > 0) {
				parts.push(`<line x1="210" y1="${legendY}" x2="230" y2="${legendY}" stroke="${COLORS.beam}" stroke-width="4"/>`);
				parts.push(`<text x="234" y="${legendY+4}" font-size="9" fill="${COLORS.beam}">Beam</text>`);
			}
		}

		parts.push(`</svg>`);
		return parts.join('');
	});

	// --- Elevation View ---
	let elevSvg = $derived.by(() => {
		const { hook, headroom } = results;
		const allSlings = collectAllSlings(results);
		const lps = getLiftingPoints(results);
		const beams = results.beams || [];
		const intermediatePoints = results.intermediatePoints || [];

		let projAxis: { x: number; y: number };
		if (beams.length > 0) {
			const b = beams[0];
			const bx = b.endB.x - b.endA.x, by = b.endB.y - b.endA.y;
			const bLen = Math.sqrt(bx * bx + by * by);
			projAxis = bLen > 0.0001 ? { x: bx / bLen, y: by / bLen } : { x: 1, y: 0 };
		} else {
			let maxSpread = 0;
			projAxis = { x: 1, y: 0 };
			for (let i = 0; i < lps.length; i++) {
				for (let j = i + 1; j < lps.length; j++) {
					const dx = lps[j].x - lps[i].x, dy = lps[j].y - lps[i].y;
					const d = Math.sqrt(dx * dx + dy * dy);
					if (d > maxSpread) { maxSpread = d; projAxis = { x: dx / d, y: dy / d }; }
				}
			}
		}

		function projectToElevation(pt: Point3D) {
			const dx = pt.x - hook.x, dy = pt.y - hook.y;
			return { h: dx * projAxis.x + dy * projAxis.y, z: pt.z };
		}

		const elevLPs = lps.map((lp, i) => ({ ...projectToElevation(lp), idx: i })).sort((a, b) => a.h - b.h);

		const slingPts3D: Point3D[] = [];
		allSlings.forEach(s => { slingPts3D.push(s.from, s.to); });
		beams.forEach(b => { slingPts3D.push(b.endA, b.endB); });
		intermediatePoints.forEach(p => slingPts3D.push(p));

		const allH = [0], allZ = [hook.z, hook.z + 1, 0];
		elevLPs.forEach(p => { allH.push(p.h); allZ.push(p.z); });
		slingPts3D.forEach(pt => { const proj = projectToElevation(pt); allH.push(proj.h); allZ.push(pt.z); });

		const minH = Math.min(...allH), maxH = Math.max(...allH);
		const minZ = Math.min(...allZ), maxZ = Math.max(...allZ);
		const rangeH = maxH - minH || 1, rangeZ = maxZ - minZ || 1;

		const pad = 60, w = 500, h = 400;
		const scale = Math.min((w - pad * 2) / rangeH, (h - pad * 2) / rangeZ);
		const cx = w / 2, cy = h - pad;
		const midH = (minH + maxH) / 2;
		const tx = (hVal: number) => cx + (hVal - midH) * scale;
		const ty = (zVal: number) => cy - (zVal - minZ) * scale;

		const parts: string[] = [];
		parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" class="w-full" style="max-width:${w}px">`);
		parts.push(`<text x="${w/2}" y="18" text-anchor="middle" font-size="14" font-weight="700" fill="${COLORS.text}">Elevation View (Side)</text>`);

		parts.push(`<line x1="20" y1="${ty(0)}" x2="${w-20}" y2="${ty(0)}" stroke="${COLORS.grid}" stroke-width="1" stroke-dasharray="4,4"/>`);
		parts.push(`<text x="${w-18}" y="${ty(0)+14}" text-anchor="end" font-size="9" fill="${COLORS.grid}">Ground</text>`);

		const hookX = tx(0), hookY = ty(hook.z);
		parts.push(`<rect x="${hookX-8}" y="${hookY-6}" width="16" height="12" rx="2" fill="${COLORS.hook}"/>`);
		parts.push(`<text x="${hookX}" y="${hookY-12}" text-anchor="middle" font-size="10" font-weight="700" fill="${COLORS.hook}">HOOK</text>`);
		parts.push(`<line x1="${hookX}" y1="${hookY-6}" x2="${hookX}" y2="${ty(hook.z+2)}" stroke="${COLORS.hook}" stroke-width="1.5" stroke-dasharray="4,3"/>`);

		beams.forEach(b => {
			const projA = projectToElevation(b.endA), projB = projectToElevation(b.endB);
			const x1 = tx(projA.h), y1 = ty(b.endA.z), x2 = tx(projB.h), y2 = ty(b.endB.z);
			parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.beam}" stroke-width="4"/>`);
			parts.push(`<circle cx="${x1}" cy="${y1}" r="4" fill="${COLORS.beam}" stroke="white" stroke-width="1"/>`);
			parts.push(`<circle cx="${x2}" cy="${y2}" r="4" fill="${COLORS.beam}" stroke="white" stroke-width="1"/>`);
		});

		intermediatePoints.forEach(p => {
			const proj = projectToElevation(p);
			const px = tx(proj.h), py = ty(p.z), sz = 4;
			parts.push(`<polygon points="${px},${py-sz} ${px+sz},${py+sz} ${px-sz},${py+sz}" fill="${COLORS.intermediate}" stroke="white" stroke-width="1"/>`);
		});

		const elevLabelPos = [0.3, 0.45, 0.55, 0.7];
		allSlings.forEach((s, sIdx) => {
			const projFrom = projectToElevation(s.from), projTo = projectToElevation(s.to);
			const color = slingColor(s.tierIndex, s.isCritical);
			const fromX = tx(projFrom.h), fromY = ty(s.from.z);
			const toX = tx(projTo.h), toY = ty(s.to.z);

			parts.push(`<line x1="${toX}" y1="${toY}" x2="${fromX}" y2="${fromY}" stroke="${color}" stroke-width="2"/>`);

			if (s.length != null) {
				const t = elevLabelPos[sIdx % elevLabelPos.length];
				const mx = toX + (fromX - toX) * t;
				const my = toY + (fromY - toY) * t;
				const offset = projFrom.h < 0 ? -8 : 8;
				const anchor = projFrom.h < 0 ? 'end' : 'start';
				parts.push(`<text x="${mx+offset}" y="${my}" text-anchor="${anchor}" font-size="9" font-weight="600" fill="${color}">${s.length.toFixed(2)}${unit}</text>`);
				if (s.angleDegFromHoriz != null) {
					parts.push(`<text x="${mx+offset}" y="${my+11}" text-anchor="${anchor}" font-size="9" fill="${color}">${s.angleDegFromHoriz.toFixed(1)}°</text>`);
				}
				if (s.tension != null) {
					parts.push(`<text x="${mx+offset}" y="${my+22}" text-anchor="${anchor}" font-size="9" fill="${color}">${s.tension.toFixed(2)}${unit === 'ft' ? 'US t' : 't'}</text>`);
				}
			}

			if (s.tierIndex === 0 && s.angleDegFromHoriz != null) {
				const arcR = 25;
				const angleRad = Math.atan2(s.to.z - s.from.z, Math.abs(projFrom.h - projTo.h));
				const endArcX = fromX + (projFrom.h < 0 ? -arcR : arcR);
				const midArcX = fromX + Math.cos(angleRad) * arcR * (projFrom.h < 0 ? -1 : 1);
				const midArcY = fromY - Math.sin(angleRad) * arcR;
				parts.push(`<path d="M ${endArcX} ${fromY} A ${arcR} ${arcR} 0 0 ${projFrom.h < 0 ? 0 : 1} ${midArcX} ${midArcY}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2,2"/>`);
			}
		});

		elevLPs.forEach(ep => {
			const lpX = tx(ep.h), lpY = ty(ep.z);
			parts.push(`<circle cx="${lpX}" cy="${lpY}" r="5" fill="${COLORS.lp}" stroke="white" stroke-width="1"/>`);
			parts.push(`<text x="${lpX}" y="${lpY+16}" text-anchor="middle" font-size="10" font-weight="700" fill="${COLORS.lp}">LP${ep.idx+1}</text>`);
		});

		const maxLPz = Math.max(...lps.map(p => p.z));
		const dimX = tx(maxH) + 40;
		if (headroom > 0.01) {
			const y1 = ty(maxLPz), y2 = ty(hook.z);
			parts.push(`<line x1="${dimX}" y1="${y1}" x2="${dimX}" y2="${y2}" stroke="${COLORS.dim}" stroke-width="1.5"/>`);
			parts.push(`<line x1="${dimX-5}" y1="${y1}" x2="${dimX+5}" y2="${y1}" stroke="${COLORS.dim}" stroke-width="1.5"/>`);
			parts.push(`<line x1="${dimX-5}" y1="${y2}" x2="${dimX+5}" y2="${y2}" stroke="${COLORS.dim}" stroke-width="1.5"/>`);
			parts.push(`<polygon points="${dimX},${y2+1} ${dimX-3},${y2+7} ${dimX+3},${y2+7}" fill="${COLORS.dim}"/>`);
			parts.push(`<polygon points="${dimX},${y1-1} ${dimX-3},${y1-7} ${dimX+3},${y1-7}" fill="${COLORS.dim}"/>`);
			parts.push(`<text x="${dimX+8}" y="${(y1+y2)/2+4}" font-size="10" font-weight="600" fill="${COLORS.dim}">${headroom.toFixed(2)}${unit}</text>`);
			parts.push(`<text x="${dimX+8}" y="${(y1+y2)/2+16}" font-size="9" fill="${COLORS.dim}">Headroom</text>`);
		}

		const dimXL = tx(minH) - 40;
		const y1h = ty(0), y2h = ty(hook.z);
		parts.push(`<line x1="${dimXL}" y1="${y1h}" x2="${dimXL}" y2="${y2h}" stroke="${COLORS.hook}" stroke-width="1" stroke-dasharray="3,3"/>`);
		parts.push(`<line x1="${dimXL-5}" y1="${y1h}" x2="${dimXL+5}" y2="${y1h}" stroke="${COLORS.hook}" stroke-width="1"/>`);
		parts.push(`<line x1="${dimXL-5}" y1="${y2h}" x2="${dimXL+5}" y2="${y2h}" stroke="${COLORS.hook}" stroke-width="1"/>`);
		parts.push(`<text x="${dimXL-8}" y="${(y1h+y2h)/2+4}" text-anchor="end" font-size="10" font-weight="600" fill="${COLORS.hook}">${results.hookHeight.toFixed(2)}${unit}</text>`);
		parts.push(`<text x="${dimXL-8}" y="${(y1h+y2h)/2+16}" text-anchor="end" font-size="9" fill="${COLORS.hook}">Hook Ht</text>`);

		parts.push(`</svg>`);
		return parts.join('');
	});
</script>

<div class="space-y-6">
	<div class="overflow-x-auto rounded-lg border border-border bg-white p-2">
		{@html planSvg}
	</div>
	<div class="overflow-x-auto rounded-lg border border-border bg-white p-2">
		{@html elevSvg}
	</div>
</div>
