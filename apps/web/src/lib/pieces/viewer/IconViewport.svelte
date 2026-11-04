<script lang="ts">
	import { onMount } from 'svelte'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import PieceIcon from '#lib/pieces/components/icon.svelte'

	const renderWidth = 500
	let { piece }: { piece: TemplatedPiece } = $props()
	let container: HTMLDivElement | undefined = $state()
	let scale = $state(1)

	onMount(() => {
		if (!container) return
		const viewport = container
		function updateScale() {
			// A hidden viewport will be measured again when it becomes visible.
			if (viewport.clientWidth > 0) scale = Math.min(1, viewport.clientWidth / renderWidth)
		}
		updateScale()
		const observer = new ResizeObserver(updateScale)
		observer.observe(viewport)
		return () => observer.disconnect()
	})
</script>

<main id="main-content" class="icon-viewport" aria-label="Piece icon">
	<div class="scale-container" bind:this={container} style:max-width="{renderWidth}px">
		<div class="icon-frame" style:width="{renderWidth}px" style:zoom={scale}>
			<PieceIcon {piece} size={{ width: renderWidth }} lazy={false} />
		</div>
	</div>
</main>

<style>
	.icon-viewport {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--space-8);
		min-height: 80vh;
		background: var(--color-surface-container-low);
	}
	.scale-container {
		width: 100%;
		min-width: 0;
	}
	.icon-frame {
		/* Zoom scales layout and the complete icon, retaining natural height and 3D overflow. */
		margin-inline: auto;
		box-shadow: var(--shadow-raised);
		outline: 1px solid var(--color-outline-variant);
	}
</style>
