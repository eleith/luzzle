<script lang="ts">
	import { page } from '$app/state'
	import loadContent from '$lib/content/load.js'
	import ContentBanner from '$lib/content/components/ContentBanner.svelte'
	import PieceIcon from '$lib/pieces/components/icon.svelte'
	import FeedPageDefault from '$lib/content/components/feed.default.svelte'

	const glob = import.meta.glob('$lib/content/components/custom/feed.svelte', { eager: true })

	let { data } = $props()
	let rssUrl = `${page.data.config.url.app}/rss/tags/${data.tag}/feed.xml`

	const FeedPage = $derived(loadContent('feed', FeedPageDefault, glob))
	const components = { ContentBanner, PieceIcon }
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title={`RSS feed for tag: ${data.tag}`}
		href={rssUrl}
	/>
</svelte:head>

<FeedPage
	feedUrl={rssUrl}
	feedType="tag"
	feedLabel={data.tag}
	feedItems={data.pieces}
	{components}
/>
