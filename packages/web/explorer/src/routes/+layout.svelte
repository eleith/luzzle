<script lang="ts">
	import '$lib/ui/styles/reset.css'
	import '$lib/ui/styles/base.css'

	const { children, data } = $props()

	function getPublicPath(assetPath: string | undefined) {
		if (!assetPath) return
		const publicPath = assetPath.replace(/^static\\/, '')
		return `${data.config.url.app_assets}/${publicPath}`
	}
</script>

<svelte:head>
	{#if data.config.paths?.css?.theme}
		<link rel="stylesheet" href={getPublicPath(data.config.paths.css.theme)} />
	{/if}
</svelte:head>

{@render children()}
