<script lang="ts">
	import Nav from '#lib/components/layout/simple/nav.svelte'
	import BellIcon from 'virtual:icons/ph/bell-simple'
	import { page } from '$app/state'
	import { resolve } from '$app/paths'

	const { children } = $props()
</script>

{#snippet rssIcon()}
	<a href={resolve(`rss/tags/${page.params.tag}/feed.html`)}><BellIcon style="font-size: 1em;" /></a
	>
{/snippet}

<Nav items={{ right: rssIcon }} />

<main id="main-content">
	{@render children()}
</main>
