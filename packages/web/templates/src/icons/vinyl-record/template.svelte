<script lang="ts">
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
	const scale = $derived(Math.round((size.width / 458) * 100) / 100)
	const height = $derived(size.height ?? size.width)
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, size.width, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, size.width, 'avif') : undefined
	)
</script>

<div
	class="vinyl-container"
	class:active
	inert
	style="
		--piece-icon-scale: {scale};
		--piece-icon-width: {size.width}px;
		--piece-icon-height: {height}px;"
>
	<div class="vinyl-disc">
		<div class="vinyl-grooves"></div>
		<div class="vinyl-label">
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
			{:else}
				<div class="vinyl-label-fallback">
					<span>{piece.title}</span>
				</div>
			{/if}
		</div>
		<div class="vinyl-hole"></div>
		<div class="vinyl-glare"></div>
	</div>
</div>

<style>
	.vinyl-container {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
	}

	.vinyl-disc {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background-color: #111;
		position: relative;
		box-shadow: calc(3px * var(--piece-icon-scale)) calc(6px * var(--piece-icon-scale))
			calc(8px * var(--piece-icon-scale)) var(--color-shadow);
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.active .vinyl-disc {
		/* Large outer glow and subtle inner glow to make it look "highlighted" */
		box-shadow:
			0 0 0 calc(2px * var(--piece-icon-scale)) var(--color-primary),
			0 0 calc(20px * var(--piece-icon-scale)) var(--color-primary),
			calc(3px * var(--piece-icon-scale)) calc(6px * var(--piece-icon-scale))
				calc(12px * var(--piece-icon-scale)) var(--color-shadow);
	}

	.vinyl-grooves {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 50%;
		/* Use fixed pixel sizes for texture to avoid aliasing artifacts at small scales */
		background: repeating-radial-gradient(#111 0, #111 2px, #222 3px, #111 4px);
	}

	.vinyl-label {
		/* Label is about 50% of the disc size to show off art */
		width: 55%;
		height: 55%;
		border-radius: 50%;
		background-color: #eee;
		position: relative;
		overflow: hidden;
		/* Constant border width to prevent image resizing/movement */
		border: calc(6px * var(--piece-icon-scale)) solid rgba(255, 255, 255, 0.1);
		transition: all 0.2s ease;
	}

	.active .vinyl-label {
		border-color: var(--color-primary);
		/* Inner glow to make the label feel more part of the highlight */
		box-shadow: 0 0 calc(15px * var(--piece-icon-scale)) var(--color-primary);
	}

	.vinyl-label img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.vinyl-label-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		font-size: calc(12px * var(--piece-icon-scale));
		color: #333;
		padding: 10px;
		background: #f0f0f0;
	}

	.vinyl-hole {
		position: absolute;
		width: 3%;
		height: 3%;
		background-color: #fff;
		border-radius: 50%;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.5);
		transition: all 0.2s ease;
	}

	.active .vinyl-hole {
		background-color: var(--color-primary);
		box-shadow: 0 0 calc(8px * var(--piece-icon-scale)) var(--color-primary);
	}

	.vinyl-glare {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0) 40%,
			rgba(255, 255, 255, 0.1) 50%,
			rgba(255, 255, 255, 0) 60%,
			rgba(255, 255, 255, 0) 100%
		);
		pointer-events: none;
	}
</style>
