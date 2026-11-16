<script lang="ts">
	import { onMount } from 'svelte'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import IconViewport from './IconViewport.svelte'
	import TemplateStatus from './TemplateStatus.svelte'

	let { piece }: { piece: TemplatedPiece } = $props()
	let mounted = $state(false)
	onMount(() => {
		mounted = true
	})
	const name = $derived(piece.templates.icon.name)
	const component = $derived.by(() => {
		// Exclude the lazy registry from Kit's server dependency graph, not just SSR execution.
		if (import.meta.env.SSR || !mounted) return undefined
		const selected = name
		return import('@luzzle/web.templates/icons/lazy').then(({ loadIcon }) => loadIcon(selected))
	})
</script>

{#if component}
	{#await component}
		<TemplateStatus view="icon" />
	{:then Icon}
		<IconViewport {Icon} {piece} />
	{:catch}
		<TemplateStatus view="icon" failed />
	{/await}
{:else}
	<TemplateStatus view="icon" />
{/if}
