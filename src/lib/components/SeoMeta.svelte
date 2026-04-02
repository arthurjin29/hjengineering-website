<script lang="ts">
	interface Props {
		title: string;
		description: string;
		ogImage?: string;
		ogUrl?: string;
		type?: string;
	}

	let {
		title,
		description,
		ogImage = '/og-default.png',
		ogUrl = 'https://hjengineering.com.au',
		type = 'website'
	}: Props = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:url" content={ogUrl} />
	<meta property="og:type" content={type} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>
