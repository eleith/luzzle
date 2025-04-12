<script lang="ts">
	import '$lib/components/layout/simple/theme.svelte'
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import KeyReturnIcon from 'virtual:icons/ph/key-return'
	import { page } from '$app/state'

	const { children } = $props()
</script>

{#snippet upIcon()}
	{#if page.data.directory !== '.'}
		<a href="/directory/list/{page.data.directory}" aria-label="rss feed">
			<KeyReturnIcon style="font-size: 1em;" />
		</a>
	{:else}
		<a href="/" aria-label="rss feed">
			<KeyReturnIcon style="font-size: 1em;" />
		</a>
	{/if}
{/snippet}

<main>
	<Nav items={{ left: upIcon }} />
	{@render children()}
</main>
