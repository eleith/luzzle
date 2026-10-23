<script lang="ts">
	import { onMount } from 'svelte'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import Opengraph from '$lib/pieces/components/opengraph.svelte'
	import { OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'

	let { piece }: { piece: TemplatedPiece } = $props()
	let container: HTMLDivElement | undefined = $state()
	let scale = $state(1)

	onMount(() => {
		function updateScale() {
			if (container) scale = Math.min(1, container.clientWidth / OpengraphImageWidth)
		}
		updateScale()
		const observer = new ResizeObserver(updateScale)
		if (container) observer.observe(container)
		return () => observer.disconnect()
	})
</script>

<main id="main-content" class="share-viewport" aria-label="Share">
	<div
		class="scale-container"
		bind:this={container}
		style:max-width="{OpengraphImageWidth}px"
		style:height="{OpengraphImageHeight * scale}px"
	>
		<div
			class="scale-inner"
			style:transform="scale({scale})"
			style:width="{OpengraphImageWidth}px"
			style:height="{OpengraphImageHeight}px"
		>
			<Opengraph {piece} />
		</div>
	</div>
</main>

<style>
	.share-viewport {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--space-8);
		min-height: 80vh;
		background: var(--color-surface-container-low);
		color: var(--color-on-surface);
	}
	.scale-container {
		width: 100%;
		margin-inline: auto;
		overflow: hidden;
		box-shadow: var(--shadow-raised);
	}
	.scale-inner {
		transform-origin: top left;
	}
</style>
