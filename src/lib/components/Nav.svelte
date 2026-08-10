<script lang="ts">
	// The gated tools are listed for everyone, with a padlock, and ask for a
	// sign-in when opened — the same treatment as the NHVR entry. Listing a
	// tool is not access: the routes enforce that server-side.

	import { page } from '$app/state';

	let mobileOpen = $state(false);
	let toolsOpen = $state(false);

	const isActive = (path: string) =>
		page.url.pathname === path || page.url.pathname.startsWith(path + '/');

	function closeMobile() {
		mobileOpen = false;
	}

	function toggleTools(e: MouseEvent) {
		e.stopPropagation();
		toolsOpen = !toolsOpen;
	}

	function closeTools() {
		toolsOpen = false;
	}
</script>

<svelte:window onclick={closeTools} />

<nav class="fixed top-0 z-50 w-full border-b border-border bg-bg-light print:hidden">
	<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
		<!-- Wordmark -->
		<a href="/" class="text-lg font-bold text-primary-text">HJ Engineering</a>

		<!-- Desktop nav -->
		<div class="hidden items-center gap-6 text-sm text-text-body md:flex">
			<a
				href="/services"
				aria-current={isActive('/services') ? 'page' : undefined}
				class="transition-colors hover:text-text-dark aria-[current=page]:font-semibold aria-[current=page]:text-text-dark"
			>Services</a>

			<!-- Tools dropdown -->
			<div class="relative">
				<button
					onclick={toggleTools}
					aria-expanded={toolsOpen}
					aria-controls="tools-dropdown"
					class="flex items-center gap-1 transition-colors hover:text-text-dark"
				>
					Tools
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				{#if toolsOpen}
					<div
						id="tools-dropdown"
						class="absolute left-0 top-full mt-2 w-56 rounded-lg border border-border bg-bg-light py-2 shadow-lg"
					>
						<a
							href="/tools/sling-calculator"
							class="block px-4 py-2 text-sm text-text-body transition-colors hover:bg-bg-subtle hover:text-text-dark"
							onclick={closeTools}
						>
							Sling Length Calculator
						</a>
						<a
							href="/tools/offset-beam-selector/index.html"
							class="block px-4 py-2 text-sm text-text-body transition-colors hover:bg-bg-subtle hover:text-text-dark"
							onclick={closeTools}
						>
							Offset Beam Selector
						</a>
						<a
							href="/tools/dual-lift-calculator"
							class="block px-4 py-2 text-sm text-text-body transition-colors hover:bg-bg-subtle hover:text-text-dark"
							onclick={closeTools}
						>
							Dual-Lift Load Share
						</a>
						<a
							href="/tools/wind-calculator"
							class="block px-4 py-2 text-sm text-text-body transition-colors hover:bg-bg-subtle hover:text-text-dark"
							onclick={closeTools}
						>
							Wind Load Calculator
						</a>
						<a
							href="/tools/access-map"
							class="flex items-center gap-2 px-4 py-2 text-sm text-text-body transition-colors hover:bg-bg-subtle hover:text-text-dark"
							onclick={closeTools}
						>
							NHVR Access Map
							<svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
								<path d="M7 11V7a5 5 0 0 1 10 0v4" />
							</svg>
						</a>
							<a
								href="/tools/pipeline-map/view"
								class="flex items-center gap-2 px-4 py-2 text-sm text-text-body transition-colors hover:bg-bg-subtle hover:text-text-dark"
								onclick={closeTools}
							>
								SE Australian Sustainable AI Construction
								<svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
									<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								</svg>
							</a>
					</div>
				{/if}
			</div>

			<a
				href="/resources"
				aria-current={isActive('/resources') ? 'page' : undefined}
				class="transition-colors hover:text-text-dark aria-[current=page]:font-semibold aria-[current=page]:text-text-dark"
			>Resources</a>
			<a
				href="/about"
				aria-current={isActive('/about') ? 'page' : undefined}
				class="transition-colors hover:text-text-dark aria-[current=page]:font-semibold aria-[current=page]:text-text-dark"
			>About</a>
			<a
				href="/blog"
				aria-current={isActive('/blog') ? 'page' : undefined}
				class="transition-colors hover:text-text-dark aria-[current=page]:font-semibold aria-[current=page]:text-text-dark"
			>Blog</a>
			<a
				href="/contact"
				class="rounded-md bg-primary-text px-4 py-1.5 font-semibold text-white transition-colors hover:bg-primary-hover"
			>
				Contact
			</a>
		</div>

		<!-- Mobile hamburger -->
		<button
			class="md:hidden"
			onclick={() => (mobileOpen = !mobileOpen)}
			aria-expanded={mobileOpen}
			aria-controls="mobile-nav"
			aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
		>
			{#if mobileOpen}
				<svg class="h-6 w-6 text-text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{:else}
				<svg class="h-6 w-6 text-text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			{/if}
		</button>
	</div>

	<!-- Mobile overlay -->
	{#if mobileOpen}
		<div
			id="mobile-nav"
			class="fixed inset-0 top-[65px] z-40 flex flex-col gap-1 bg-bg-light px-6 py-6 md:hidden"
		>
			<a href="/services" aria-current={isActive('/services') ? 'page' : undefined} class="rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle aria-[current=page]:font-semibold aria-[current=page]:text-text-dark" onclick={closeMobile}>Services</a>
			<a href="/tools/sling-calculator" class="rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle" onclick={closeMobile}>Sling Length Calculator</a>
			<a href="/tools/offset-beam-selector/index.html" class="rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle" onclick={closeMobile}>Offset Beam Selector</a>
			<a href="/tools/dual-lift-calculator" class="rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle" onclick={closeMobile}>Dual-Lift Load Share</a>
			<a href="/tools/wind-calculator" class="rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle" onclick={closeMobile}>Wind Load Calculator</a>
			<a href="/tools/access-map" class="flex items-center gap-2 rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle" onclick={closeMobile}>
				NHVR Access Map
				<svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
			</a>
				<a href="/tools/pipeline-map/view" class="flex items-center gap-2 rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle" onclick={closeMobile}>
					SE Australian Sustainable AI Construction
					<svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
				</a>
			<a href="/resources" aria-current={isActive('/resources') ? 'page' : undefined} class="rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle aria-[current=page]:font-semibold aria-[current=page]:text-text-dark" onclick={closeMobile}>Resources</a>
			<a href="/about" aria-current={isActive('/about') ? 'page' : undefined} class="rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle aria-[current=page]:font-semibold aria-[current=page]:text-text-dark" onclick={closeMobile}>About</a>
			<a href="/blog" aria-current={isActive('/blog') ? 'page' : undefined} class="rounded-lg px-4 py-3 text-base text-text-body hover:bg-bg-subtle aria-[current=page]:font-semibold aria-[current=page]:text-text-dark" onclick={closeMobile}>Blog</a>
			<a
				href="/contact"
				class="mt-4 rounded-md bg-primary-text px-4 py-3 text-center font-semibold text-white hover:bg-primary-hover"
				onclick={closeMobile}
			>
				Contact
			</a>
		</div>
	{/if}
</nav>
