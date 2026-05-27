<script lang="ts">
	import '$lib/dual-lift-calc/dual-lift.css';
	let { children } = $props();
</script>

<div class="dlc-app">
	{@render children()}
</div>
