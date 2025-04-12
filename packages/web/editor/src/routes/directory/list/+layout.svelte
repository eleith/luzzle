<script lang="ts">
	import '$lib/components/layout/simple/theme.svelte'
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import CreateIcon from 'virtual:icons/ph/file-plus'
	import KeyReturnIcon from 'virtual:icons/ph/key-return'
	import { page } from '$app/state'

	const { children } = $props()
</script>

{#snippet upIcon()}
	{#if page.data.directory.parent !== '.'}
		<a href="/directory/list/{page.data.directory.parent}" aria-label="rss feed">
			<KeyReturnIcon style="font-size: 1em;" />
		</a>
	{:else}
		<a href="/" aria-label="rss feed">
			<KeyReturnIcon style="font-size: 1em;" />
		</a>
	{/if}
{/snippet}

{#snippet createIcon()}
	<a href="/pieces/create/{page.params.directory}" aria-label="rss feed"
		><CreateIcon style="font-size: 1em;" /></a
	>
{/snippet}

<main>
	<Nav items={{ right: createIcon, left: upIcon }} />
	{@render children()}
</main>
