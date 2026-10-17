<script lang="ts">
	import '@luzzle/web.theme/styles/reset.css'
	import '@luzzle/web.theme/styles/base.css'
	import '@luzzle/web.theme/styles/markdown.css'
	import '$lib/ui/styles/theme.build.css'

	import type { LayoutProps } from './$types'

	let { data, params, children }: LayoutProps = $props()
</script>

<svelte:head>
	<link rel="icon" href="{data.config.url.app_assets}/images/favicon.png" />
</svelte:head>

{#key params.jobId}
	{@render children()}
{/key}
