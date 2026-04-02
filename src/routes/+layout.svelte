<script lang="ts">
	import './layout.css';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();
</script>

<Nav />
<main class="pt-[65px]">
	{@render children()}
</main>
<Footer />
