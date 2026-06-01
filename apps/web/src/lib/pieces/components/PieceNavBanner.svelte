<script lang="ts">
	import type { NavBannerProps } from '$lib/pieces/helpers'
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import GearIcon from 'virtual:icons/ph/gear'
	import { onMount } from 'svelte'

	let { items, ...rest }: NavBannerProps = $props()

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

<NavBanner
	{...rest}
	items={{
		left: items?.left,
		right: rightSnippet
	}}
/>
