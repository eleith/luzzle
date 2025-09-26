<script lang="ts">
	import '$lib/ui/styles/reset.css'
	import '$lib/ui/styles/base.css'

	const { children } = $props()
</script>

<svelte:head>
	<link rel="stylesheet" href="/css/theme.css" />
</svelte:head>

{@render children()}
