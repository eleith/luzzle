<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import BellIcon from 'virtual:icons/ph/bell-simple'
	import GearIcon from 'virtual:icons/ph/gear'
	import { page } from '$app/state'
	import { onMount } from 'svelte'

	const { children } = $props()

	let isAdmin = $state(false)

	onMount(() => {
		isAdmin = localStorage.getItem('luzzle.admin') === 'true'
	})
</script>

{#snippet rightItems()}
	{#if isAdmin}
		<a href="/admin" aria-label="admin">
			<GearIcon style="font-size: 1em;" />
		</a>
	{/if}
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
