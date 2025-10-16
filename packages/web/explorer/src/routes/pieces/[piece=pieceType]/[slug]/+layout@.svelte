<script lang="ts">
	import { page } from '$app/state'
	import Nav from '$lib/components/layout/simple/nav.svelte'

	const { children } = $props()
</script>

<main>
	{#if page.data.piece.media}
		<Nav background="var(--colors-surface-container-lowest)" />
	{:else}
		<Nav />
	{/if}
	{@render children()}
</main>
