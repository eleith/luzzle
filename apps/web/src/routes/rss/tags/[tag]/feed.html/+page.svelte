<script lang="ts">
	import FeedPage from '$lib/feeds/page.svelte'

	let { data } = $props()
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title={`RSS feed for tag: ${data.tag}`}
		href={data.feed.url}
	/>
</svelte:head>

<FeedPage feed={data.feed} pieces={data.pieces} about={data.about} links={data.links} />
