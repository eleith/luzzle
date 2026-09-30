<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import BellIcon from 'virtual:icons/ph/bell-simple'
	import { page } from '$app/state'
	const { children } = $props()
</script>

{#snippet rightItems()}
	{#if page.params.piece}
		<a href="/rss/pieces/{page.params.piece}/feed.html" aria-label="rss feed"
			><BellIcon style="font-size: 1em;" /></a
		>
	{:else}
		<a href="/rss/pieces/feed.html" aria-label="rss feed"><BellIcon style="font-size: 1em;" /></a>
	{/if}
{/snippet}

<Nav items={{ right: rightItems }} />

<main id="main-content">
	{@render children()}
</main>
