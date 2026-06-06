<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'

	const { children } = $props()
</script>

<Nav />

<main id="main-content">
	{@render children()}
</main>
