<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import GearIcon from 'virtual:icons/ph/gear'
	import { onMount } from 'svelte'

	let { items, showRandom = false, ...rest }: ComponentProps<typeof Nav> = $props()

	let isAdmin = $state(false)
	onMount(() => {
		isAdmin = localStorage.getItem('luzzle.admin') === 'true'
	})
</script>

{#snippet rightSnippet()}
	{#if isAdmin}
		<a href="/admin" aria-label="admin">
			<GearIcon style="font-size: 1em;" />
		</a>
	{/if}
	{#if items?.right}
		{@render items.right()}
	{/if}
{/snippet}

<Nav
	{...rest}
	{showRandom}
	items={{
		left: items?.left,
		right: rightSnippet
	}}
/>
