<script lang="ts">
	import { page } from '$app/state'
	import RootPageDefault from '$lib/content/components/root.default.svelte'
	import loadContent from '$lib/content/load'
	import ContentBanner from '$lib/content/components/ContentBanner.svelte'
	import PieceIcon from '$lib/pieces/components/icon.svelte'

	let { data } = $props()

	const glob = import.meta.glob('$lib/content/components/custom/root.svelte', { eager: true })

	const RootPage = $derived(loadContent('root', RootPageDefault, glob))
	const components = { ContentBanner, PieceIcon }
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title="RSS feed | all"
		href={`${page.data.config.url.app}/rss/pieces/feed.xml`}
	/>
</svelte:head>

<RootPage types={data.types} pieces={data.pieces} {components} />
