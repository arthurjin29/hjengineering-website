<script lang="ts">
	import './layout.css';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();
</script>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary-text focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
>
	Skip to content
</a>
<header>
	<Nav />
</header>
<main id="main-content" class="pt-[65px]">
	{@render children()}
</main>
<Footer />
