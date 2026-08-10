<script lang="ts">
	import { page } from '$app/state';

	const SITE = 'https://www.hjengineering.com.au';

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
		ogUrl = undefined,
		type = 'website'
	}: Props = $props();

	// Social scrapers do not resolve relative paths — og:image and og:url must be absolute.
	const absolute = (path: string) => (/^https?:\/\//.test(path) ? path : SITE + path);

	const imageUrl = $derived(absolute(ogImage));
	const canonical = $derived(ogUrl ? absolute(ogUrl) : SITE + page.url.pathname);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content="HJ Engineering" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
</svelte:head>
