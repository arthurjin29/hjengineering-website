<script lang="ts">
	import SeoMeta from '$lib/components/SeoMeta.svelte';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<SeoMeta title="Whitelist Admin — HJ Engineering" description="Manage approved user emails" />

<section class="bg-bg-light px-8 py-12">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-2 text-2xl font-bold text-text-dark">Access Whitelist</h1>
		<p class="mb-8 text-sm text-text-muted">
			Manage which Google accounts can access authenticated tools. Signed in as {data.adminEmail}.
		</p>

		{#if form?.error}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
				{form.message}
			</div>
		{/if}

		<!-- Add email -->
		<form method="POST" action="?/add" use:enhance class="mb-8 flex gap-3">
			<input
				type="email"
				name="email"
				placeholder="user@example.com"
				required
				class="flex-1 rounded-md border border-border bg-bg-light px-3 py-2 text-sm text-text-dark placeholder:text-text-muted focus:border-primary-text focus:outline-none focus:ring-1 focus:ring-primary-text"
			/>
			<button
				type="submit"
				class="rounded-md bg-primary-text px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
			>
				Add
			</button>
		</form>

		<!-- Whitelist table -->
		<div class="rounded-lg border border-border">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-border bg-bg-subtle">
						<th class="px-4 py-3 text-left font-medium text-text-dark">Email</th>
						<th class="px-4 py-3 text-right font-medium text-text-dark">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.whitelist as email}
						<tr class="border-b border-border last:border-b-0">
							<td class="px-4 py-3 font-mono text-text-body">{email}</td>
							<td class="px-4 py-3 text-right">
								<form method="POST" action="?/remove" use:enhance class="inline">
									<input type="hidden" name="email" value={email} />
									<button
										type="submit"
										class="text-sm text-red-600 transition-colors hover:text-red-800"
									>
										Remove
									</button>
								</form>
							</td>
						</tr>
					{/each}
					{#if data.whitelist.length === 0}
						<tr>
							<td colspan="2" class="px-4 py-6 text-center text-text-muted">No emails in whitelist</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</section>
