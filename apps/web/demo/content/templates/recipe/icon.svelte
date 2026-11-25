<script lang="ts">
	import type { IconProps } from '@luzzle/web.templates/icons/props'
	import type { Fields } from '@luzzle/web.templates/icons/recipe-card/schema'

	function getRecipeCutouts(width: number) {
		const scale = Math.round((width / 375) * 100) / 100
		const radius = Math.round(10 * scale)
		const slotHeight = Math.round(8 * scale)
		const slotWidth = Math.round(7.5 * scale)
		const halfSlotWidth = slotWidth / 2
		const height = 2 * radius + slotHeight
		const cornerRadius = Math.round(12 * scale)
		const centers = [0.25, 0.5, 0.75].map((position) => Math.round(width * position))
		const intersectionY = Math.round(
			radius + Math.sqrt(radius * radius - halfSlotWidth * halfSlotWidth)
		)

		const path = [
			`M0,0 H${width} V${height - cornerRadius}`,
			`A${cornerRadius},${cornerRadius} 0 0,1 ${width - cornerRadius},${height}`,
			`H${cornerRadius} A${cornerRadius},${cornerRadius} 0 0,1 0,${height - cornerRadius} Z`,
			...centers.map((center) =>
				[
					`M${center - halfSlotWidth},${height}`,
					`V${intersectionY}`,
					`A${radius},${radius} 0 1,1 ${center + halfSlotWidth},${intersectionY}`,
					`V${height} Z`
				].join(' ')
			)
		].join(' ')

		return { height, path }
	}

	let { piece, fields, size, helpers, lazy = false }: IconProps<Fields> = $props()
	const cardWidth = $derived(size.width)
	const scale = $derived(cardWidth / 375)
	const cutouts = $derived(getRecipeCutouts(cardWidth))
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, cardWidth, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, cardWidth, 'avif') : undefined
	)
	const ingredients = $derived(fields.ingredients?.slice(0, 3))
</script>

<div
	class="recipe-card"
	inert
	style="
		--card-scale: {scale};
		--card-width: {cardWidth}px;
		--card-max-height: {size.height ?? (cardWidth * 3) / 2}px;"
>
	{#if imageUrl}
		<picture class="card-image">
			{#if imageAvif}
				<source srcset={imageAvif} type="image/avif" />
			{/if}
			<img
				src={imageUrl}
				loading={lazy ? 'lazy' : 'eager'}
				fetchpriority={lazy ? 'auto' : 'high'}
				alt=""
			/>
		</picture>
	{/if}
	<div class="card-body">
		<div class="card-title">{piece.title}</div>
		{#if ingredients?.length}
			<div class="ingredient-preview">
				{#each ingredients as ingredient}
					<div class="card-line">
						<span class="checkbox"></span>
						<span class="ingredient-text">{ingredient.item}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<div
		class="card-cutouts"
		style="height: {cutouts.height}px; clip-path: path(evenodd, '{cutouts.path}');"
	></div>
</div>

<style>
	.recipe-card {
		--card-paper: #f4ead3;
		--card-ink: #45423b;
		--card-radius: max(4px, calc(12px * var(--card-scale)));
		--card-inset: max(6px, calc(14px * var(--card-scale)));

		width: var(--card-width);
		max-height: var(--card-max-height);
		display: flex;
		flex-direction: column;
		filter: drop-shadow(2px 4px 3px rgb(0 0 0 / 28%));
		border-radius: var(--card-radius) var(--card-radius) 0 0;
		overflow: hidden;
	}

	:global([data-active='true']) .recipe-card {
		outline: 2px solid var(--color-primary);
	}

	.card-image {
		display: block;
		height: calc(var(--card-width) * 0.64);
		min-height: 0;
	}

	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.card-body {
		background: var(--card-paper);
		flex-shrink: 0;
		padding: var(--card-inset) var(--card-inset) 0;
		overflow: hidden;
		font-size: max(9px, calc(16px * var(--card-scale)));
		line-height: 1.6;
		color: var(--card-ink);
	}

	.card-title {
		font-weight: 700;
	}

	.card-cutouts {
		background: var(--card-paper);
		flex-shrink: 0;
	}

	.ingredient-preview {
		margin-top: var(--card-inset);
	}

	.card-line {
		display: flex;
		align-items: center;
		gap: max(4px, calc(8px * var(--card-scale)));
	}

	.checkbox {
		width: max(5px, calc(10px * var(--card-scale)));
		height: max(5px, calc(10px * var(--card-scale)));
		border: max(1px, calc(1.5px * var(--card-scale))) solid currentColor;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.card-title,
	.ingredient-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
