<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<SeoMeta
	title="Contact — HJ Engineering"
	description="Get in touch with HJ Engineering for crane lift planning, temporary works, ground assessment, and engineering consultancy."
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hjengineering.com.au/" },
			{ "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://hjengineering.com.au/contact" }
		]
	})}</script>`}
</svelte:head>

<!-- Hero -->
<section class="bg-gradient-to-b from-bg-dark to-bg-card-dark px-8 py-16 text-center text-text-light">
	<p class="mb-2 text-xs uppercase tracking-[2px] text-primary">Contact</p>
	<h1 class="mx-auto mb-4 max-w-xl text-3xl font-bold">Get in Touch</h1>
	<p class="mx-auto max-w-lg text-sm leading-relaxed text-text-faint">
		Discuss your project requirements or request a quote.
	</p>
</section>

<section class="bg-bg-light px-8 py-12">
	<div class="mx-auto grid max-w-4xl grid-cols-1 gap-12 md:grid-cols-5">
		<!-- Form -->
		<div class="md:col-span-3">
			{#if form?.success}
				<div class="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
					<h2 class="mb-2 text-lg font-bold text-green-800">Message Sent</h2>
					<p class="text-sm text-green-700">Thanks for getting in touch. We'll get back to you shortly.</p>
				</div>
			{:else}
				{#if form?.error}
					<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
						{form.error}
					</div>
				{/if}

				<form method="POST" use:enhance class="space-y-5">
					<!-- Honeypot -->
					<div class="absolute -left-[9999px]" aria-hidden="true">
						<label for="website">Website</label>
						<input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
					</div>

					<div>
						<label for="name" class="mb-1 block text-sm font-medium text-text-dark">Name *</label>
						<input
							type="text"
							id="name"
							name="name"
							required
							value={form?.values?.name ?? ''}
							class="w-full rounded-md border border-border bg-bg-light px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-primary-text focus:outline-none focus:ring-1 focus:ring-primary-text"
						/>
					</div>

					<div>
						<label for="email" class="mb-1 block text-sm font-medium text-text-dark">Email *</label>
						<input
							type="email"
							id="email"
							name="email"
							required
							value={form?.values?.email ?? ''}
							class="w-full rounded-md border border-border bg-bg-light px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-primary-text focus:outline-none focus:ring-1 focus:ring-primary-text"
						/>
					</div>

					<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
						<div>
							<label for="phone" class="mb-1 block text-sm font-medium text-text-dark">Phone</label>
							<input
								type="tel"
								id="phone"
								name="phone"
								value={form?.values?.phone ?? ''}
								class="w-full rounded-md border border-border bg-bg-light px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-primary-text focus:outline-none focus:ring-1 focus:ring-primary-text"
							/>
						</div>
						<div>
							<label for="company" class="mb-1 block text-sm font-medium text-text-dark">Company</label>
							<input
								type="text"
								id="company"
								name="company"
								value={form?.values?.company ?? ''}
								class="w-full rounded-md border border-border bg-bg-light px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-primary-text focus:outline-none focus:ring-1 focus:ring-primary-text"
							/>
						</div>
					</div>

					<div>
						<label for="message" class="mb-1 block text-sm font-medium text-text-dark">Message *</label>
						<textarea
							id="message"
							name="message"
							required
							rows="5"
							class="w-full rounded-md border border-border bg-bg-light px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-primary-text focus:outline-none focus:ring-1 focus:ring-primary-text"
						>{form?.values?.message ?? ''}</textarea>
					</div>

					<button
						type="submit"
						class="rounded-md bg-primary-text px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
					>
						Send Message
					</button>
				</form>
			{/if}
		</div>

		<!-- Contact details -->
		<div class="md:col-span-2">
			<div class="rounded-lg border border-border bg-bg-subtle p-6">
				<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-dark">Contact Details</h2>
				<dl class="space-y-4 text-sm">
					<div>
						<dt class="font-medium text-text-muted">Email</dt>
						<dd>
							<a href="mailto:arthur@hjengineering.com.au" class="text-primary-text hover:text-primary-hover">
								arthur@hjengineering.com.au
							</a>
						</dd>
					</div>
					<div>
						<dt class="font-medium text-text-muted">Registrations</dt>
						<dd class="text-text-dark">PE · CPEng · NER · RPEQ</dd>
					</div>
					<div>
						<dt class="font-medium text-text-muted">ABN</dt>
						<dd class="font-mono text-text-dark">34 695 221 768</dd>
					</div>
					<div>
						<dt class="font-medium text-text-muted">Location</dt>
						<dd class="text-text-dark">Melbourne, Australia</dd>
					</div>
				</dl>
			</div>
		</div>
	</div>
</section>
