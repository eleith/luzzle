<script lang="ts">
	import '@luzzle/web.theme/styles/reset.css'
	import '@luzzle/web.theme/styles/base.css'
	import '@luzzle/web.theme/styles/markdown.css'
	import type { LayoutProps } from './$types'
	import ViewerHeader from '#lib/pieces/viewer/ViewerHeader.svelte'

	let { data, children }: LayoutProps = $props()
</script>

<svelte:head>
	<title>Published: {data.piece.title}</title>
	<meta name="robots" content="noindex" />
	<link rel="icon" href="{data.config.url.app_assets}/images/favicon.png" />
</svelte:head>

<ViewerHeader links={data.links} />
{@render children()}
