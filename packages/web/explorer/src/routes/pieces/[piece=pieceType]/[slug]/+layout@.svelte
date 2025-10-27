<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'

	const { children } = $props()
</script>

<main>
	<Nav />
	{@render children()}
</main>
