<script lang="ts">
	import '$lib/components/layout/simple/theme.svelte'
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import KeyReturnIcon from 'virtual:icons/ph/key-return'
	import PenIcon from 'virtual:icons/ph/pen'
	import { page } from '$app/state'

	const { children } = $props()
</script>

{#snippet upIcon()}
	{#if page.data.directory !== '.'}
		<a href="/directory/list/{page.data.directory}" aria-label="up">
			<KeyReturnIcon style="font-size: 1em;" />
		</a>
	{:else}
		<a href="/" aria-label="rss feed">
			<KeyReturnIcon style="font-size: 1em;" />
		</a>
	{/if}
{/snippet}

{#snippet editIcon()}
	{#if page.data.mode === 'list'}
		<a href="/pieces/edit/{page.data.file}" aria-label="edit piece">
			<PenIcon style="font-size: 1em;" />
		</a>
	{/if}
{/snippet}

<main>
	<Nav items={{ left: upIcon, right: editIcon }} />
	{@render children()}
</main>
