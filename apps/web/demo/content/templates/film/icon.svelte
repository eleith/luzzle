<script lang="ts">
	import type { IconProps } from '../icon/props'
	import type { Fields } from '@luzzle/web.templates/icons/poster/schema'

	let { piece, fields, size, helpers, lazy = false }: IconProps<Fields> = $props()
	const scale = $derived(Math.round((size.width / 375) * 100) / 100)
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, size.width, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, size.width, 'avif') : undefined
	)
</script>

<div
	class="poster"
	inert
	style="
	  --piece-icon-scale: {scale};
	  --piece-icon-width: {size.width}px;
		--piece-icon-height: {size.height ?? (size.width * 3) / 2}px;"
>
	<div class="poster-title">
		{piece.title}
	</div>
	{#if imageUrl}
		<picture>
			<source srcset={imageAvif} type="image/avif" />
			<img
				src={imageUrl}
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
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		text-align: center;
		line-height: 1.2;
		padding: calc(1rem * var(--piece-icon-scale));
		word-break: break-all;
		overflow: hidden;
	}

	.poster-title {
		position: relative;
	}

	:global([data-active='true']) .poster {
		outline: solid 1px var(--color-primary);
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		background: var(--color-primary);
		border: calc(10px * var(--piece-icon-scale)) solid var(--color-primary);
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
