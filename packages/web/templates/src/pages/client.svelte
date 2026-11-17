<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
	import type { PageComponent } from './props.js'

	let {
		name,
		children,
		pending,
		failed
	}: {
		name: string
		children: Snippet<[Page: PageComponent]>
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
		return import('./lazy.js').then(({ loadPage }) => loadPage(selected))
	})
</script>

{#if component}
	{#await component}
		{@render pending()}
	{:then Page}
		{@render children(Page)}
	{:catch}
		{@render failed()}
	{/await}
{:else}
	{@render pending()}
{/if}
