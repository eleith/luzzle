<script lang="ts">
	import type { PieceIconProps } from '$lib/pieces/helpers'
	const { size, piece }: PieceIconProps = $props()
</script>

<div
	class="piece-no-icon"
	style="
		--piece-icon-scale: {(Math.round((size.width / 375) * 100) / 100).toFixed(2)};
		--piece-icon-border-color: #999;
		--piece-icon-background-color: var(--color-secondary-container);
		--piece-icon-text-color: var(--color-on-secondary-container);
		--piece-icon-height: {(size.width * 3) / 2}px;
		--piece-icon-width: {size.width}px;
		"
>
	<div>
		{piece.type}
	</div>
	<div style="position: relative;">
		{piece.title}
	</div>
</div>

<style>
	.piece-no-icon {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		border-radius: 8px;
		background-color: var(--piece-icon-background-color);
		overflow: hidden;
		color: var(--piece-icon-text-color);
		text-align: center;
		border: 5px solid var(--piece-icon-border-color);
		display: flex;
		flex-direction: column;
	}

	.piece-no-icon div:first-child {
		font-weight: bold;
		font-size: calc(3rem * var(--piece-icon-scale));
		background-color: var(--piece-icon-text-color);
		color: var(--piece-icon-background-color);
	}

	.piece-no-icon div:last-child {
		padding: 0.25em 0.5em;
		font-size: calc(2rem * var(--piece-icon-scale));
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
