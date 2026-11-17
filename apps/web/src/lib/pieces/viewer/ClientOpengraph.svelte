<script lang="ts">
	import LoadOpengraph from '@luzzle/web.templates/opengraphs/client'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import { OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
	import { getPieceHelpers } from '#lib/pieces/helpers.js'
	import PreviewLoading from './PreviewLoading.svelte'

	const canvasMaxWidth = `min(${OpengraphImageWidth}px, calc(80svh * ${OpengraphImageWidth} / ${OpengraphImageHeight}))`

	let { piece }: { piece: TemplatedPiece } = $props()
	const fields = $derived(piece.templates.opengraph.fields)
	const helpers = $derived(getPieceHelpers(piece))

	let container: HTMLDivElement | undefined = $state()
	let scale = $state(1)
	$effect(() => {
		// The canvas appears after the import resolves, later than this component's onMount.
		if (!container) return
		const viewport = container
		function updateScale() {
			if (viewport.clientWidth > 0) scale = Math.min(1, viewport.clientWidth / OpengraphImageWidth)
		}
		updateScale()
		const observer = new ResizeObserver(updateScale)
		observer.observe(viewport)
		return () => observer.disconnect()
	})
</script>

{#snippet loadingPreview()}
	<div
		class="loading-canvas"
		style:max-width={canvasMaxWidth}
		style:aspect-ratio="{OpengraphImageWidth} / {OpengraphImageHeight}"
	>
		<PreviewLoading label="Loading browser preview…" />
	</div>
	<noscript><p>JavaScript is required to display the browser preview.</p></noscript>
{/snippet}

<LoadOpengraph name={piece.templates.opengraph.name} pending={loadingPreview}>
	{#snippet children(Opengraph)}
		<div
			class="scale-container"
			bind:this={container}
			style:max-width={canvasMaxWidth}
			style:height="{OpengraphImageHeight * scale}px"
		>
			<div
				class="opengraph-canvas"
				style:width="{OpengraphImageWidth}px"
				style:height="{OpengraphImageHeight}px"
				style:transform="scale({scale})"
			>
				<Opengraph {piece} {fields} {helpers} />
			</div>
		</div>
	{/snippet}
	{#snippet failed()}
		<p role="alert">The browser preview could not be loaded.</p>
		<button type="button" onclick={() => window.location.reload()}>Reload</button>
	{/snippet}
</LoadOpengraph>

<style>
	.loading-canvas,
	.scale-container {
		width: 100%;
		margin-inline: auto;
	}
	.loading-canvas {
		display: grid;
		place-items: center;
	}
	.scale-container {
		overflow: hidden;
		box-shadow: var(--shadow-raised);
	}
	.opengraph-canvas {
		transform-origin: top left;
	}
</style>
