<script lang="ts">
	import '$lib/dual-lift-calc/dual-lift.css';
	let { children } = $props();
</script>

<div class="dlc-app">
	<aside class="dlc-disclaimer" role="note" aria-label="Engineering disclaimer">
		<p>
			<strong>Disclaimer.</strong> This tool provides <em>geometric load-share calculations only</em>
			to assist a Competent Person preparing a documented lift plan. It does <strong>not</strong>
			replace engineering judgment, the crane manufacturer's rated-capacity chart, a documented
			lift study, or compliance with AS 2550, AS 1418, ISO 12480-1, ICSA N002, or any applicable
			site-specific safety procedures. All results must be verified against the manufacturer's
			rated-capacity chart at the planned lift radius and reviewed by a qualified engineer.
			HJ Engineering accepts no liability for use of this tool outside the documented scope.
		</p>
	</aside>
	{@render children()}
</div>
