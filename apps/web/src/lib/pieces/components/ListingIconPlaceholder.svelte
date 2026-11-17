<script lang="ts">
	import PuzzlePiece from 'virtual:icons/ph/puzzle-piece'

	let { width }: { width: number } = $props()
</script>

<div class="icon-placeholder" style:width="{width}px" aria-hidden="true">
	<PuzzlePiece aria-hidden="true" focusable="false" />
</div>

<style>
	.icon-placeholder {
		display: grid;
		place-items: center;
	}

	.icon-placeholder :global(svg) {
		width: 1.8225rem;
		height: 1.8225rem;
		color: var(--color-on-surface-variant);
		opacity: 0.4;
	}
</style>
