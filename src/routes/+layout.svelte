<script lang="ts">
	import './layout.css';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children, data } = $props();
</script>

<!-- `session` drives whether the gated tools appear in the menu. It is
     discoverability only — every gated route re-checks the session and the
     whitelist server-side, so a hidden link is not the access control. -->
<Nav session={data.session} />
<main class="pt-[65px]">
	{@render children()}
</main>
<Footer />
