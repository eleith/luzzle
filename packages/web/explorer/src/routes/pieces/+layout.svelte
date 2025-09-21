<script lang="ts">
	import '$lib/components/layout/simple/theme.svelte'
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import BellIcon from 'virtual:icons/ph/bell-simple'
	import { page } from '$app/state'

	const { children } = $props()
</script>

{#snippet rssIcon()}
	{#if page.params.piece}
		<a href="/rss/pieces/{page.params.piece}/feed.html" aria-label="rss feed"
			><BellIcon style="font-size: 1em;" /></a
		>
	{:else}
		<a href="/rss/pieces/feed.xml" aria-label="rss feed"><BellIcon style="font-size: 1em;" /></a>
	{/if}
{/snippet}

<main>
	<Nav items={{ right: rssIcon }} />
	{@render children()}
</main>
