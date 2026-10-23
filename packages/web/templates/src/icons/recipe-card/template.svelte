<script lang="ts">
	import { getRecipeCutouts } from './helpers.js'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = {
		piece: PublicWebPiece
		fields: Fields
		size: { width: number; height?: number }
		helpers: PieceComponentHelpers
		lazy?: boolean
		active?: boolean
	}
	let { piece, fields, size, helpers, lazy = false, active = false }: Props = $props()
	const palette = $derived(helpers.getPiecePalette())
	const headerColor = $derived({
		bg: palette?.background || '#827717',
		text: palette?.titleText || '#ffffff'
	})
	const scale = $derived(Math.round((size.width / 375) * 100) / 100)
	const cardWidth = $derived(size.width)
	const ingredients = $derived(fields.ingredients ?? [])
	const cutouts = $derived(getRecipeCutouts(cardWidth))
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, cardWidth, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, cardWidth, 'avif') : undefined
	)
</script>

<div
	class="recipe-card"
	class:active
	inert
	style="
		--card-scale: {scale};
		--card-width: {cardWidth}px;
		--card-max-height: {size.height ?? (cardWidth * 3) / 2}px;
		--card-bg: {palette?.background || '#ffffff'};
		--card-text-color: {palette?.bodyText || '#37474f'};
		--card-accent: {palette?.accent || '#78909c'};"
>
	<div
		class="card-header"
		style="--header-bg: {palette?.background ||
			headerColor.bg}; --header-text: {palette?.titleText || headerColor.text}"
	>
		<div class="card-title">{piece.title}</div>
	</div>
	{#if imageUrl}
		<div class="card-image" style="--image-overlay: {palette?.background || headerColor.bg}">
			<div class="image-overlay"></div>
			<picture>
				<source srcset={imageAvif} type="image/avif" />
				<img
					src={imageUrl}
					loading={lazy ? 'lazy' : 'eager'}
					fetchpriority={lazy ? 'auto' : 'high'}
					alt=""
				/>
			</picture>
		</div>
	{/if}
	<div class="card-body">
		<div class="ingredients-grid">
			{#each ingredients as ingredient}
				<div class="card-line">
					<span class="checkbox"></span>
					<span class="ingredient-text">{ingredient.item}</span>
				</div>
			{/each}
		</div>
	</div>
	<div
		class="card-cutouts"
		style="
			height: {cutouts.height}px;
			clip-path: path(evenodd, '{cutouts.path}');"
	></div>
</div>

<style>
	.active {
		--card-radius: calc(12px * var(--card-scale));
		outline: 1px solid var(--color-primary);
		border-radius: var(--card-radius) var(--card-radius) 0 0;
	}

	.recipe-card {
		--card-text-light: #78909c;
		--card-border: #d7ccc8;
		--card-header-bg: #efebe4;
		--card-radius: calc(12px * var(--card-scale));

		width: var(--card-width);
		max-height: var(--card-max-height);
		display: flex;
		flex-direction: column;
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		border-radius: var(--card-radius) var(--card-radius) 0 0;
		overflow: hidden;
	}

	/* Header */
	.card-header {
		background: var(--header-bg);
		padding: calc(10px * var(--card-scale)) calc(14px * var(--card-scale));
		flex-shrink: 0;
	}

	.active .card-header {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}

	.active .card-title {
		color: var(--color-on-primary);
	}

	.card-title {
		font-size: calc(18px * var(--card-scale));
		font-weight: 700;
		color: var(--header-text);
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Card image */
	.card-image {
		height: calc(100px * var(--card-scale));
		overflow: hidden;
		position: relative;
	}

	.image-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: var(--image-overlay);
		opacity: 0.6;
		z-index: 1;
	}

	.card-image picture {
		width: 100%;
		height: 100%;
		display: block;
	}

	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Card body */
	.card-body {
		flex: 1 1 auto;
		background: var(--card-bg);
		overflow: hidden;
		padding: calc(10px * var(--card-scale)) calc(14px * var(--card-scale));
	}

	/* Bottom strip with ring cutouts */
	.card-cutouts {
		background: var(--card-bg);
		flex-shrink: 0;
		padding-top: 5px;
		margin-top: -2px;
	}

	.ingredients-grid {
		columns: 2;
		column-gap: calc(10px * var(--card-scale));
	}

	.card-line {
		display: flex;
		align-items: center;
		gap: calc(8px * var(--card-scale));
		line-height: 1.6;
		font-size: calc(14px * var(--card-scale));
		color: var(--card-text-color);
	}

	.checkbox {
		width: calc(10px * var(--card-scale));
		height: calc(10px * var(--card-scale));
		border: calc(1.5px * var(--card-scale)) solid var(--card-accent);
		border-radius: calc(2px * var(--card-scale));
		flex-shrink: 0;
	}

	.ingredient-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
