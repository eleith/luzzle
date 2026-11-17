<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
	import type { IconComponent } from './props.js'

	let {
		name,
		children,
		pending,
		failed
	}: {
		name: string
		children: Snippet<[Icon: IconComponent]>
		pending: Snippet
		failed: Snippet
	} = $props()
	let mounted = $state(false)
	onMount(() => {
		mounted = true
	})
	const component = $derived.by(() => {
		// Exclude the registry from the server dependency graph, not just SSR execution.
		if (import.meta.env.SSR || !mounted) return undefined
		const selected = name
		return import('./lazy.js').then(({ loadIcon }) => loadIcon(selected))
	})
</script>

{#if component}
	{#await component}
		{@render pending()}
	{:then Icon}
		{@render children(Icon)}
	{:catch}
		{@render failed()}
	{/await}
{:else}
	{@render pending()}
{/if}
