<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
</script>

<SeoMeta
	title="Access requested — HJ Engineering"
	description="Your access request has been recorded."
/>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="bg-bg-light px-8 py-20">
	<div class="mx-auto max-w-lg text-center">
		<h1 class="mb-3 text-2xl font-bold text-text-dark">Access requested</h1>
		<p class="mb-6 text-sm leading-relaxed text-text-muted">
			Your Google account is not on the access list for HJ Engineering's internal tools yet.
			We have recorded the request — no need to send it again.
		</p>
		<p class="text-sm leading-relaxed text-text-muted">
			Arthur reviews these by hand. If it is urgent, email
			<a class="text-primary-text underline" href="mailto:arthur@hjengineering.com.au">
				arthur@hjengineering.com.au
			</a>.
		</p>
	</div>
</section>
