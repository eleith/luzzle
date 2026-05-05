<script lang="ts">
	import type { PieceIconProps } from '$lib/pieces/helpers'

	let { piece, size, helpers, lazy, active }: PieceIconProps = $props()

	const scale = Math.round((size.width / 375) * 100) / 100

	const imageKey = $derived(piece.metadata.cover || piece.metadata.image || piece.metadata.poster)
</script>

<div
	class="default-icon"
	class:active
	inert
	style="
		--piece-icon-scale: {scale};
		--piece-icon-width: {size.width}px;
		--piece-icon-height: {(size.width * 3) / 2}px;"
>
	<div class="default-icon-title">
		{piece.title}
	</div>
	{#if imageKey}
		<picture>
			<source srcset={helpers.getPieceImageUrl(imageKey, size.width, 'avif')} type="image/avif" />
			<img
				src={helpers.getPieceImageUrl(imageKey, size.width, 'jpg')}
				loading={lazy ? 'lazy' : 'eager'}
				fetchpriority={lazy ? 'auto' : 'high'}
				alt=""
			/>
		</picture>
	{/if}
</div>

<style>
	.default-icon {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		display: flex;
		position: relative;
		justify-content: center;
		align-items: center;
		background: var(--color-surface-container);
		color: var(--color-on-surface);
		font-size: calc(3rem * var(--piece-icon-scale));
		border: calc(10px * var(--piece-icon-scale)) solid var(--color-surface-container-highest);
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		text-align: center;
		line-height: 1.2;
		padding: calc(1rem * var(--piece-icon-scale));
		word-break: break-all;
		overflow: hidden;
	}

	.default-icon-title {
		position: relative;
	}

	.active {
		outline: 1px solid var(--color-primary);
		border-radius: calc(0.75rem * var(--piece-icon-scale));
	}

	.default-icon img {
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		object-fit: cover;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
</style>
