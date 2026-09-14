<script lang="ts">
	import type { NavBannerProps } from '$lib/pieces/helpers'
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import AtIcon from 'virtual:icons/ph/at'
	import { onMount } from 'svelte'

	let { items, ...rest }: NavBannerProps = $props()

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

<NavBanner
	{...rest}
	items={{
		left: leftSnippet,
		right: items?.right
	}}
/>
