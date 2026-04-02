<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-[calc(100vh-65px-76px)] flex-col items-center justify-center px-6 text-center">
	<p class="mb-2 text-6xl font-bold text-primary">{page.status}</p>
	<h1 class="mb-4 text-2xl font-bold text-text-dark">
		{#if page.status === 404}
			Page not found
		{:else if page.status === 403}
			Access denied
		{:else}
			Something went wrong
		{/if}
	</h1>
	<p class="mb-8 max-w-md text-text-muted">
		{#if page.status === 404}
			The page you're looking for doesn't exist or has been moved.
		{:else if page.status === 403}
			You don't have permission to access this page.
		{:else}
			An unexpected error occurred. Please try again later.
		{/if}
	</p>
	<a
		href="/"
		class="rounded-md bg-primary-text px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
	>
		Back to homepage
	</a>
</div>
