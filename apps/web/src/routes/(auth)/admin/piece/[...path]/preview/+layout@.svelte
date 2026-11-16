<script lang="ts">
	import '@luzzle/web.theme/styles/reset.css'
	import '@luzzle/web.theme/styles/base.css'
	import '@luzzle/web.theme/styles/markdown.css'

	import type { LayoutProps } from './$types'

	let { data, children }: LayoutProps = $props()
</script>

<svelte:head>
	<link rel="icon" href={data.config.content.images.favicon} />
</svelte:head>

{@render children()}
