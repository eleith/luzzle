<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import BellIcon from 'virtual:icons/ph/bell-simple'
	import { page } from '$app/state'

	const { children } = $props()
</script>

{#snippet rssIcon()}
	<a href="/rss/tags/{page.params.tag}/feed.html"><BellIcon style="font-size: 1em;" /></a>
{/snippet}

<main>
	<Nav items={{ right: rssIcon }} />
	{@render children()}
</main>
