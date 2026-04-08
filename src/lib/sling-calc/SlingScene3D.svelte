<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { CalcResult, Point3D } from './types';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

	interface Props {
		results: CalcResult;
		cog: Point3D;
		unit?: string;
	}

	let { results, cog, unit = 'm' }: Props = $props();

	let containerEl: HTMLDivElement;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let labelRenderer: CSS2DRenderer;
	let controls: OrbitControls;
	let sceneObjects: (THREE.Object3D | CSS2DObject)[] = [];
	let animFrameId: number;

	const COLORS = {
		critical: 0xe74c3c,
		normal: 0x27ae60,
		lp: 0x2980b9,
		cog: 0xe67e22,
		hook: 0x2c3e50,
		load: 0x3498db,
		beam: 0xc0392b,
		intermediate: 0x8b5cf6,
		dim: 0x8e44ad
	};

	const TIER_PALETTES = [
		{ normal: 0x27ae60, critical: 0xe74c3c, normalHex: '#27ae60', criticalHex: '#e74c3c' },
		{ normal: 0xe67e22, critical: 0xe67e22, normalHex: '#e67e22', criticalHex: '#e67e22' },
		{ normal: 0x9b59b6, critical: 0x9b59b6, normalHex: '#9b59b6', criticalHex: '#9b59b6' }
	];

	function createSphere(radius: number, color: number): THREE.Mesh {
		const geo = new THREE.SphereGeometry(radius, 16, 16);
		const mat = new THREE.MeshLambertMaterial({ color });
		return new THREE.Mesh(geo, mat);
	}

	function createDiamond(size: number, color: number): THREE.Mesh {
		const geo = new THREE.OctahedronGeometry(size);
		const mat = new THREE.MeshLambertMaterial({ color });
		return new THREE.Mesh(geo, mat);
	}

	function createLabel(text: string, color: string, background = false): CSS2DObject {
		const div = document.createElement('div');
		div.style.color = color;
		div.style.fontSize = '12px';
		div.style.fontWeight = '700';
		div.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
		div.style.whiteSpace = 'pre';
		div.style.textAlign = 'center';
		div.style.lineHeight = '1.3';
		if (background) {
			div.style.background = 'rgba(255,255,255,0.85)';
			div.style.padding = '2px 6px';
			div.style.borderRadius = '4px';
			div.style.border = `1px solid ${color}`;
		}
		div.textContent = text;
		const label = new CSS2DObject(div);
		label.layers.set(0);
		return label;
	}

	function addToScene(obj: THREE.Object3D) {
		scene.add(obj);
		sceneObjects.push(obj);
	}

	function clearScene() {
		for (const obj of sceneObjects) {
			scene.remove(obj);
			if ('geometry' in obj && (obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
			if ('material' in obj) {
				const mat = (obj as THREE.Mesh).material;
				if (Array.isArray(mat)) mat.forEach(m => m.dispose());
				else if (mat && typeof mat.dispose === 'function') mat.dispose();
			}
			if (obj instanceof CSS2DObject && obj.element?.parentNode) {
				obj.element.parentNode.removeChild(obj.element);
			}
		}
		sceneObjects = [];
	}

	function fitCamera(pts: Point3D[]) {
		if (pts.length === 0) return;
		let minX = Infinity, maxX = -Infinity;
		let minY = Infinity, maxY = -Infinity;
		let minZ = Infinity, maxZ = -Infinity;
		for (const p of pts) {
			minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
			minY = Math.min(minY, p.z); maxY = Math.max(maxY, p.z);
			minZ = Math.min(minZ, -p.y); maxZ = Math.max(maxZ, -p.y);
		}
		const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
		const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 5);
		controls.target.set(cx, cy, cz);
		camera.position.set(cx + size * 1.2, cy + size * 0.8, cz + size * 1.2);
		camera.lookAt(cx, cy, cz);
		controls.update();
	}

	function updateScene(r: CalcResult, cogPt: Point3D) {
		clearScene();

		const { hook } = r;
		const tiers = r.tiers || [];
		const beams = r.beams || [];
		const intermediatePoints = r.intermediatePoints || [];
		const lps = tiers.length > 0 ? tiers[0].slings.map(s => s.from) : [];
		const unitLen = unit;

		// Load footprint polygon
		if (lps.length >= 3) {
			const cx = lps.reduce((s, p) => s + p.x, 0) / lps.length;
			const cy = lps.reduce((s, p) => s + p.y, 0) / lps.length;
			const ordered = [...lps].sort((a, b) =>
				Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
			);
			const shape = new THREE.Shape();
			shape.moveTo(ordered[0].x, -ordered[0].y);
			for (let i = 1; i < ordered.length; i++) shape.lineTo(ordered[i].x, -ordered[i].y);
			shape.closePath();
			const geo = new THREE.ShapeGeometry(shape);
			const mat = new THREE.MeshBasicMaterial({ color: COLORS.load, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
			const mesh = new THREE.Mesh(geo, mat);
			const avgZ = lps.reduce((s, p) => s + p.z, 0) / lps.length;
			mesh.rotation.x = -Math.PI / 2;
			mesh.position.y = avgZ;
			addToScene(mesh);

			// Outline
			const pts = ordered.map(p => new THREE.Vector3(p.x, p.z, -p.y));
			pts.push(pts[0].clone());
			const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
			const lineMat = new THREE.LineBasicMaterial({ color: COLORS.load });
			addToScene(new THREE.Line(lineGeo, lineMat));
		}

		// Lifting points
		lps.forEach((lp, i) => {
			const sphere = createSphere(0.12, COLORS.lp);
			sphere.position.set(lp.x, lp.z, -lp.y);
			addToScene(sphere);

			const label = createLabel(lp.label || `LP${i + 1}`, '#2980b9');
			label.position.set(lp.x, lp.z + 0.35, -lp.y);
			addToScene(label);
		});

		// COG
		const cogM = createDiamond(0.15, COLORS.cog);
		cogM.position.set(cogPt.x, cogPt.z, -cogPt.y);
		addToScene(cogM);
		const cogLabel = createLabel('COG', '#e67e22');
		cogLabel.position.set(cogPt.x, cogPt.z + 0.35, -cogPt.y);
		addToScene(cogLabel);

		// Hook
		const hookGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8);
		const hookMat = new THREE.MeshLambertMaterial({ color: COLORS.hook });
		const hookMesh = new THREE.Mesh(hookGeo, hookMat);
		hookMesh.position.set(hook.x, hook.z, -hook.y);
		addToScene(hookMesh);
		const hookLabel = createLabel('HOOK', '#2c3e50');
		hookLabel.position.set(hook.x, hook.z + 0.5, -hook.y);
		addToScene(hookLabel);

		// Crane wire
		const wirePts = [
			new THREE.Vector3(hook.x, hook.z, -hook.y),
			new THREE.Vector3(hook.x, hook.z + 3, -hook.y)
		];
		const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePts);
		const wireMat = new THREE.LineDashedMaterial({ color: 0x7f8c8d, dashSize: 0.3, gapSize: 0.15 });
		const wireLine = new THREE.Line(wireGeo, wireMat);
		wireLine.computeLineDistances();
		addToScene(wireLine);

		// Beams
		beams.forEach(beam => {
			const ptA = new THREE.Vector3(beam.endA.x, beam.endA.z, -beam.endA.y);
			const ptB = new THREE.Vector3(beam.endB.x, beam.endB.z, -beam.endB.y);
			if (ptA.distanceTo(ptB) < 0.001) return;
			const path = new THREE.LineCurve3(ptA, ptB);
			const tubeGeo = new THREE.TubeGeometry(path, 1, 0.06, 8, false);
			const tubeMat = new THREE.MeshLambertMaterial({ color: COLORS.beam });
			addToScene(new THREE.Mesh(tubeGeo, tubeMat));

			const mid = new THREE.Vector3().lerpVectors(ptA, ptB, 0.5);
			const beamLabel = createLabel(beam.name || 'Beam', '#c0392b', true);
			beamLabel.position.set(mid.x, mid.y + 0.5, mid.z);
			addToScene(beamLabel);
		});

		// Intermediate points
		intermediatePoints.forEach(pt => {
			const sphere = createSphere(0.1, COLORS.intermediate);
			sphere.position.set(pt.x, pt.z, -pt.y);
			addToScene(sphere);
		});

		// Slings
		const labelPositions = [0.35, 0.45, 0.55, 0.65];
		let globalIdx = 0;
		tiers.forEach((tier, tierIdx) => {
			const palette = TIER_PALETTES[tierIdx] || TIER_PALETTES[0];
			tier.slings.forEach(s => {
				const fromPt = new THREE.Vector3(s.from.x, s.from.z, -s.from.y);
				const toPt = new THREE.Vector3(s.to.x, s.to.z, -s.to.y);
				const color = s.isCritical ? palette.critical : palette.normal;
				if (fromPt.distanceTo(toPt) < 0.001) { globalIdx++; return; }

				const path = new THREE.LineCurve3(fromPt, toPt);
				const tubeGeo = new THREE.TubeGeometry(path, 1, 0.03, 8, false);
				const tubeMat = new THREE.MeshLambertMaterial({ color });
				addToScene(new THREE.Mesh(tubeGeo, tubeMat));

				const t = labelPositions[globalIdx % labelPositions.length];
				const mid = new THREE.Vector3().lerpVectors(fromPt, toPt, t);
				const labelColor = s.isCritical ? palette.criticalHex : palette.normalHex;
				const slingLabel = createLabel(
					`${s.length.toFixed(2)}${unitLen} ${s.angleDegFromHoriz.toFixed(0)}\u00B0`,
					labelColor, true
				);
				slingLabel.position.copy(mid);
				addToScene(slingLabel);
				globalIdx++;
			});
		});

		// Headroom dimension
		const maxLPz = lps.length > 0 ? Math.max(...lps.map(p => p.z)) : 0;
		if (r.headroom > 0.01 && lps.length > 0) {
			const dimX = hook.x + 1.5;
			const dimPts = [
				new THREE.Vector3(dimX, maxLPz, -hook.y),
				new THREE.Vector3(dimX, hook.z, -hook.y)
			];
			const dimGeo = new THREE.BufferGeometry().setFromPoints(dimPts);
			const dimMat = new THREE.LineDashedMaterial({ color: COLORS.dim, dashSize: 0.2, gapSize: 0.1 });
			const dimLine = new THREE.Line(dimGeo, dimMat);
			dimLine.computeLineDistances();
			addToScene(dimLine);

			const dimLabel = createLabel(`Headroom\n${r.headroom.toFixed(2)}${unitLen}`, '#8e44ad');
			dimLabel.position.set(dimX, (maxLPz + hook.z) / 2, -hook.y);
			addToScene(dimLabel);
		}

		// Fit camera
		const camPts = [...lps, hook];
		beams.forEach(b => { camPts.push(b.endA, b.endB); });
		intermediatePoints.forEach(pt => camPts.push(pt));
		fitCamera(camPts);
	}

	function onResize() {
		if (!containerEl || !camera) return;
		const w = containerEl.clientWidth;
		const h = containerEl.clientHeight;
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		renderer.setSize(w, h);
		labelRenderer.setSize(w, h);
	}

	function animate() {
		animFrameId = requestAnimationFrame(animate);
		controls.update();
		renderer.render(scene, camera);
		labelRenderer.render(scene, camera);
	}

	onMount(() => {
		const w = containerEl.clientWidth;
		const h = containerEl.clientHeight || 450;

		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xf0f4f8);

		camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
		camera.position.set(15, 10, 15);

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(w, h);
		renderer.setPixelRatio(window.devicePixelRatio);
		containerEl.appendChild(renderer.domElement);

		labelRenderer = new CSS2DRenderer();
		labelRenderer.setSize(w, h);
		labelRenderer.domElement.style.position = 'absolute';
		labelRenderer.domElement.style.top = '0';
		labelRenderer.domElement.style.pointerEvents = 'none';
		containerEl.appendChild(labelRenderer.domElement);

		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.1;

		scene.add(new THREE.AmbientLight(0xffffff, 0.6));
		const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
		dirLight.position.set(10, 20, 10);
		scene.add(dirLight);

		const grid = new THREE.GridHelper(30, 30, 0xbbbbbb, 0xdddddd);
		scene.add(grid);
		scene.add(new THREE.AxesHelper(3));

		window.addEventListener('resize', onResize);
		animate();

		updateScene(results, cog);
	});

	onDestroy(() => {
		if (animFrameId) cancelAnimationFrame(animFrameId);
		window.removeEventListener('resize', onResize);
		if (renderer) {
			renderer.dispose();
			renderer.domElement.remove();
		}
		if (labelRenderer) {
			labelRenderer.domElement.remove();
		}
		clearScene();
	});

	// Re-render when results change
	$effect(() => {
		if (scene && results) {
			updateScene(results, cog);
		}
	});
</script>

<div class="relative w-full" style="height: 450px;">
	<div bind:this={containerEl} class="absolute inset-0 rounded-lg overflow-hidden"></div>
</div>
