<script lang="ts">
	import { onMount } from 'svelte'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import TemplatePage from '#lib/templates/page.svelte'
	import TemplateStatus from './TemplateStatus.svelte'

	let { piece, tags }: { piece: TemplatedPiece; tags: Array<{ slug: string; tag: string }> } =
		$props()
	let mounted = $state(false)
	onMount(() => {
		mounted = true
	})
	const name = $derived(piece.templates.page.name)
	const component = $derived.by(() => {
		// Exclude the lazy registry from Kit's server dependency graph, not just SSR execution.
		if (import.meta.env.SSR || !mounted) return undefined
		const selected = name
		return import('@luzzle/web.templates/pages/lazy').then(({ loadPage }) => loadPage(selected))
	})
</script>

{#if component}
	{#await component}
		<TemplateStatus view="page" />
	{:then Page}
		<TemplatePage {Page} {piece} {tags} />
	{:catch}
		<TemplateStatus view="page" failed />
	{/await}
{:else}
	<TemplateStatus view="page" />
{/if}
