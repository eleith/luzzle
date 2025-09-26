<script lang="ts">
	import '$lib/ui/styles/reset.css'
	import '$lib/ui/styles/base.css'

	const { children, data } = $props()
</script>

<svelte:head>
	<link
		rel="stylesheet"
		href="{data.config.url.app_assets}/css/theme.{data.config.theme.version}.css"
	/>
</svelte:head>

{@render children()}
