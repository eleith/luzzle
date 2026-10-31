<script lang="ts">
	import FeedPage from '#lib/feeds/page.svelte'

	let { data } = $props()
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title={data.type ? `RSS feed for ${data.type}` : 'RSS feed'}
		href={data.feed.url}
	/>
</svelte:head>

<FeedPage feed={data.feed} pieces={data.pieces} about={data.about} links={data.links} />
