<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
	import type { OpengraphComponent } from './props.js'

	let {
		name,
		children,
		pending,
		failed
	}: {
		name: string
		children: Snippet<[Opengraph: OpengraphComponent]>
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
		return import('./lazy.js').then(({ loadOpengraph }) => loadOpengraph(selected))
	})
</script>

{#if component}
	{#await component}
		{@render pending()}
	{:then Opengraph}
		{@render children(Opengraph)}
	{:catch}
		{@render failed()}
	{/await}
{:else}
	{@render pending()}
{/if}
