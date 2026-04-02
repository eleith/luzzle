<script lang="ts">
	import { type PieceIconProps } from '$lib/pieces/helpers'
	let { piece, size, helpers, lazy }: PieceIconProps = $props()

	const scale = Math.round((size.width / 375) * 100) / 100
</script>

<div
	class="poster"
	style="
	  --piece-icon-scale: {scale};
	  --piece-icon-width: {size.width}px; 
		--piece-icon-height: {(size.width * 3) / 2}px;"
>
	<div class="poster-title">
		{piece.title}
	</div>
	{#if piece.metadata.poster}
		<picture>
			<source
				srcset={helpers.getPieceImageUrl(piece.metadata.poster, size.width, 'avif')}
				type="image/avif"
			/>
			<img
				src={helpers.getPieceImageUrl(piece.metadata.poster, size.width, 'jpg')}
				loading={lazy ? 'lazy' : 'eager'}
				fetchpriority={lazy ? 'auto' : 'high'}
				alt=""
			/>
		</picture>
	{/if}
</div>

<style>
	.poster {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		display: flex;
		position: relative;
		justify-content: center;
		align-items: center;
		background: white;
		color: black;
		font-size: calc(3rem * var(--piece-icon-scale));
		border: calc(10px * var(--piece-icon-scale)) solid white;
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		box-shadow: 2.6px 5.3px 5.3px var(--colors-shadow);
		text-align: center;
		line-height: 1.2;
		padding: calc(1rem * var(--piece-icon-scale));
		word-break: break-all;
		overflow: hidden;
	}

	.poster-title {
		position: relative;
	}

	.poster img {
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		object-fit: cover;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
</style>
