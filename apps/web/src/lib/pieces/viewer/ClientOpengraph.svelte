<script lang="ts">
	import LoadOpengraph from '@luzzle/web.templates/opengraphs/client'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import { OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'
	import ShareCardFrame from './ShareCardFrame.svelte'
	import PreviewLoading from './PreviewLoading.svelte'

	const maxWidth = `min(${OpengraphImageWidth}px, calc(80svh * ${OpengraphImageWidth} / ${OpengraphImageHeight}))`

	let { piece }: { piece: TemplatedPiece } = $props()
	const fields = $derived(piece.templates.opengraph.fields)
	const helpers = $derived(getPieceHelpers(piece))
</script>

{#snippet loadingPreview()}
	<div
		class="loading-preview"
		style:max-width={maxWidth}
		style:aspect-ratio="{OpengraphImageWidth} / {OpengraphImageHeight}"
	>
		<PreviewLoading label="Loading browser preview…" />
	</div>
	<noscript><p>JavaScript is required to display the browser preview.</p></noscript>
{/snippet}

<LoadOpengraph name={piece.templates.opengraph.name} pending={loadingPreview}>
	{#snippet children(Opengraph)}
		<ShareCardFrame><Opengraph {piece} {fields} {helpers} /></ShareCardFrame>
	{/snippet}
	{#snippet failed()}
		<p role="alert">The browser preview could not be loaded.</p>
		<button type="button" onclick={() => window.location.reload()}>Reload</button>
	{/snippet}
</LoadOpengraph>

<style>
	.loading-preview {
		width: 100%;
		margin-inline: auto;
		display: grid;
		place-items: center;
	}
</style>
