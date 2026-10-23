<script lang="ts">
	import { getCartridgeFit } from './helpers.js'
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
	const scale = $derived(Math.round((size.width / 375) * 100) / 100)
	const height = $derived(size.height ?? (size.width * 3) / 2)
	const fit = $derived(getCartridgeFit(size.width, height))
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, size.width, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, size.width, 'avif') : undefined
	)
</script>

<div
	class="cartridge-container"
	style:overflow={fit.scale < 1 ? 'hidden' : undefined}
	class:active
	inert
	style="
  --game-scale: {scale};
  --game-width: {size.width}px;
	--game-height: {height}px;"
>
	<div class="cartridge" style:transform={`scale(${fit.scale})`}>
		<div class="cartridge-top"></div>
		<div class="cartridge-header">
			<div class="cartridge-header-overlay">
				<div class="cartridge-brand">
					<span class="cartridge-brand-name">{piece.title}</span>
				</div>
			</div>
		</div>
		<div class="cartridge-body">
			<div class="cartridge-end"></div>
			<div class="cartridge-label-container">
				<div class="cartridge-gap">
					<div class="cartridge-image-container">
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
				</div>
				<div class="cartridge-arrow-down"></div>
			</div>
			<div class="cartridge-end"></div>
		</div>
	</div>
</div>

<style>
	.cartridge-container {
		--game-border-radius: 7px;
		position: relative;
		width: var(--game-width);
		height: var(--game-height);
	}

	.cartridge {
		transform-origin: top center;
		width: var(--game-width);
		box-shadow: 8px 8px 8px var(--color-shadow);
		border-radius: 0 0 var(--game-border-radius) var(--game-border-radius);
	}

	.cartridge-top {
		width: calc(var(--game-width) * 0.9);
		height: calc(var(--game-width) * 1.25 * 0.02);
		background: #8c8c8c;
		border-radius: var(--game-border-radius) var(--game-border-radius) 0 0;
		box-shadow: 0px -2px 0px var(--color-shadow);
	}

	.cartridge-body {
		width: var(--game-width);
		background: #8c8c8c;
		border-radius: 0 0 var(--game-border-radius) var(--game-border-radius);
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		background-image: linear-gradient(transparent, #666);
	}

	.cartridge-label-container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cartridge-end {
		width: 5%;
		height: calc(var(--game-width) * 1.25 * 0.35);
		background: #5d5d5d;
		border-top: 3px solid #444;
	}

	.cartridge-end:first-child {
		border-radius: 0 0 0 var(--game-border-radius);
	}

	.cartridge-end:last-child {
		border-radius: 0 0 var(--game-border-radius) 0;
	}

	.cartridge-gap {
		width: calc(var(--game-width) * 0.74);
		height: calc(var(--game-width) * 0.74);
		background: #666;
		background-image: linear-gradient(#666, #555);
		border-radius: var(--game-border-radius);
		display: flex;
		justify-content: center;
		align-items: center;
		border-top: 2px solid #444;
		border-bottom: 2px solid #aaa;
		overflow: hidden;
	}

	.cartridge-arrow-down {
		border-top: 1px solid #555;
		border-left: 1px solid transparent;
		border-right: 1px solid transparent;
		border-width: calc(var(--game-width) * 0.1);
		border-radius: 10px;
		margin: 8px 0 8px 0;
		filter: drop-shadow(0 1px 0 #999) drop-shadow(0 -1px 0 #444);
	}

	.active .cartridge-arrow-down {
		border-top: calc(var(--game-width) * 0.1) solid var(--color-primary);
	}

	.cartridge-header {
		justify-content: center;
		width: calc(var(--game-width) * 1);
		height: calc(var(--game-width) * 1.25 * 0.12);
		background: linear-gradient(#8c8c8c 0 15%, transparent 15% 75%, #8c8c8c 75%),
			linear-gradient(90deg, transparent 0 1%, #444 1% 5%, #000 50%, #444 95% 99%, transparent 99%);
		border-radius: 0 var(--game-border-radius) 0 0;
		display: flex;
		align-items: center;
		container: cartridge / inline-size;
	}

	.cartridge-header-overlay {
		width: 100%;
		height: 75%;
		display: flex;
		justify-content: center;
		align-items: center;
		background: repeating-linear-gradient(var(--game-color, #8c8c8c) 0 10%, transparent 10% 20%);
	}

	.cartridge-brand {
		width: 78%;
		height: 100%;
		background: linear-gradient(#444 5%, #707070 85%);
		box-shadow:
			0 5px 15px 10px #4448 inset,
			0 -1px 0 1px #ddd inset,
			0 1px 2px 2px #222 inset;
		border: clamp(0px, 5%, 5px) solid var(--game-color, #8c8c8c);
		border-radius: 75px;
		transform: translate(0, 3%);
		display: flex;
		justify-content: center;
		align-items: center;
		color: #fff;
		text-shadow: 1px 2px 1px #0005;
		overflow: hidden;
		text-overflow: ellipsis;
		text-wrap: nowrap;
	}

	.cartridge-brand-name {
		font-size: calc(1rem * var(--game-scale));
		letter-spacing: 0px;
		display: inline-block;
		padding-left: calc(7px * var(--game-scale));
		padding-right: calc(7px * var(--game-scale));
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.cartridge-image-container img {
		width: calc(var(--game-width) * 0.67);
		height: calc(var(--game-width) * 0.67);
		object-fit: cover;
		border-radius: var(--game-border-radius);
		object-position: top;
	}
</style>
