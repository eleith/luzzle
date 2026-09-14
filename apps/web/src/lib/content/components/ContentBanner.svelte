<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import AtIcon from 'virtual:icons/ph/at'
	import { onMount } from 'svelte'

	let { items, showRandom = false, ...rest }: ComponentProps<typeof Nav> = $props()

	let isAdmin = $state(false)
	onMount(() => {
		isAdmin = localStorage.getItem('luzzle.admin') === 'true'
	})
</script>

{#snippet leftSnippet()}
	{#if isAdmin}
		<a href="/admin" aria-label="admin">
			<AtIcon style="font-size: 1em;" />
		</a>
	{/if}
	{#if items?.left}
		{@render items.left()}
	{/if}
{/snippet}

<Nav
	{...rest}
	{showRandom}
	items={{
		left: leftSnippet,
		right: items?.right
	}}
/>
