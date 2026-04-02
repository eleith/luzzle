<script lang="ts">
	import { type PieceIconProps } from '$lib/pieces/helpers'
	let { piece, size, helpers, lazy }: PieceIconProps = $props()

	function interpolate(
		value: number,
		input: { min: number; max: number },
		output: { min: number; max: number }
	) {
		if (value <= input.min) {
			return output.min
		}

		if (value >= input.max) {
			return output.max
		}

		const inputRange = input.max - input.min
		const progress = (value - input.min) / inputRange
		const outputRange = output.max - output.min
		const finalValue = output.min + outputRange * progress

		return parseFloat(finalValue.toFixed(2))
	}

	const scale = Math.round((size.width / 375) * 100) / 100
	const pages = piece.metadata.pages as number | 100
	const thickness = interpolate(
		pages * scale,
		{ min: 1, max: 650 },
		{ min: 25, max: size.width / 2 }
	)
</script>

<div
	class="book"
	style="
		--piece-icon-book-color: black;
		--piece-icon-text-color: white;
		--piece-icon-transform-start: rotateY(48deg) rotateX(-9deg) rotateZ(-9deg) translateZ({thickness}px) translateX(-48px) translateY(-20px);
		--piece-icon-transform-display: block;
		--piece-icon-transition: transform 0.75s ease;
		--piece-icon-scale: {scale};
		--piece-icon-color-shadow: transparent;
	  --piece-icon-thickness: {thickness}px;
	  --piece-icon-width: {size.width}px; 
		--piece-icon-height: {(size.width * 3) / 2}px;"
>
	<div class="book-shadow"></div>
	<div class="book-spine">
		<div class="book-spine-text">
			<span class="book-spine-author">
				{piece.metadata.author}
			</span>
			<span class="book-spine-title">
				{piece.title}
			</span>
		</div>
	</div>
	<div class="book-pages"></div>
	<div class="book-pages-bottom"></div>
	<div class="book-pages-top"></div>
	<div class="book-back"></div>
	<div class="book-cover">
		<div class="book-cover-front">
			{piece.title}
		</div>
		{#if piece.metadata.cover}
			<picture>
				<source
					srcset={helpers.getPieceImageUrl(piece.metadata.cover, size.width, 'avif')}
					type="image/avif"
				/>
				<img
					src={helpers.getPieceImageUrl(piece.metadata.cover, size.width, 'jpg')}
					loading={lazy ? 'lazy' : 'eager'}
					fetchpriority={lazy ? 'auto' : 'high'}
					alt=""
				/>
			</picture>
		{/if}
	</div>
</div>

<style>
	.book-cover img {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		object-fit: cover;
	}

	.book {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		position: relative;
		color: var(--piece-book-text-color);
		transition: var(--piece-icon-transition);
		transform: var(--piece-icon-transform-start, none);
		box-shadow: -8px 8px 8px var(--piece-icon-color-shadow);
		transform-style: preserve-3d;
	}

	.book-pages {
		display: var(--piece-icon-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		left: 0;
		top: var(--piece-icon-page-offset, 3px);
		width: calc(var(--piece-icon-thickness) - 10px);
		height: calc(var(--piece-icon-height) - 2 * var(--piece-icon-page-offset, 3px));
		transform: translateX(
				calc(
					var(--piece-icon-width) - var(--piece-icon-thickness) / 2 -
						var(--piece-icon-page-offset, 3px)
				)
			)
			translateZ(calc(0px - var(--piece-icon-thickness) / 2)) rotateY(90deg);
		background: linear-gradient(
			90deg,
			#fff 0%,
			#f9f9f9 5%,
			#fff 10%,
			#f9f9f9 15%,
			#fff 20%,
			#f9f9f9 25%,
			#fff 30%,
			#f9f9f9 35%,
			#fff 40%,
			#f9f9f9 45%,
			#fff 50%,
			#f9f9f9 55%,
			#fff 60%,
			#f9f9f9 65%,
			#fff 70%,
			#f9f9f9 75%,
			#fff 80%,
			#f9f9f9 85%,
			#fff 90%,
			#f9f9f9 95%,
			#fff 100%
		);
	}

	.book-pages-bottom {
		display: var(--piece-icon-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		left: 1px;
		bottom: 0;
		width: calc(var(--piece-icon-width) - 4px);
		height: var(--piece-icon-thickness);
		transform: translateY(calc(var(--piece-icon-thickness) / 2 - 5px))
			translateZ(calc(-1px - var(--piece-icon-thickness) / 2)) rotateX(90deg);
		background: linear-gradient(
			0deg,
			#fff 0%,
			#f9f9f9 5%,
			#fff 10%,
			#f9f9f9 15%,
			#fff 20%,
			#f9f9f9 25%,
			#fff 30%,
			#f9f9f9 35%,
			#fff 40%,
			#f9f9f9 45%,
			#fff 50%,
			#f9f9f9 55%,
			#fff 60%,
			#f9f9f9 65%,
			#fff 70%,
			#f9f9f9 75%,
			#fff 80%,
			#f9f9f9 85%,
			#fff 90%,
			#f9f9f9 95%,
			#fff 100%
		);
	}

	.book-pages-top {
		display: var(--piece-icon-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		right: 1px;
		top: 0px;
		width: calc(var(--piece-icon-width) - 4px);
		height: var(--piece-icon-thickness);
		transform: translate3D(
				0px,
				calc(0px - (var(--piece-icon-thickness) / 2 - 5px)),
				calc(-1px - var(--piece-icon-thickness) / 2)
			)
			rotate3D(1, 0, 0, 90deg);
		background: linear-gradient(
			0deg,
			#fff 0%,
			#f9f9f9 5%,
			#fff 10%,
			#f9f9f9 15%,
			#fff 20%,
			#f9f9f9 25%,
			#fff 30%,
			#f9f9f9 35%,
			#fff 40%,
			#f9f9f9 45%,
			#fff 50%,
			#f9f9f9 55%,
			#fff 60%,
			#f9f9f9 65%,
			#fff 70%,
			#f9f9f9 75%,
			#fff 80%,
			#f9f9f9 85%,
			#fff 90%,
			#f9f9f9 95%,
			#fff 100%
		);
	}

	.book-spine {
		align-items: center;
		color: #fff;
		display: flex;
		font-size: 1.5rem;
		justify-content: center;
		outline: solid 1px transparent;
		width: calc(var(--piece-icon-thickness));
		height: var(--piece-icon-height);
		transform: translateX(calc(0px - (var(--piece-icon-thickness) / 2)))
			translateZ(calc(0px - var(--piece-icon-thickness) / 2)) rotateY(-90deg);
		background-color: var(--piece-icon-book-color);
	}

	.book-back {
		display: var(--piece-icon-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		top: 0;
		left: 0;
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		transform: translateZ(calc(0px - var(--piece-icon-thickness)));
		background-color: var(--piece-icon-book-color);
		border-top-right-radius: var(--piece-icon-border-radius, 7px);
		border-bottom-right-radius: var(--piece-icon-border-radius, 7px);
	}

	.book-cover-front {
		width: 100%;
		position: absolute;
		outline: solid 1px transparent;
		text-align: center;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
		hyphens: auto;
		padding: 7px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: calc(3rem * var(--piece-icon-scale));
	}

	.book-cover {
		position: absolute;
		outline: solid 1px transparent;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
		background-color: var(--piece-icon-book-color);
		overflow: hidden;
		border-top-right-radius: var(--piece-icon-border-radius, 7px);
		border-bottom-right-radius: var(--piece-icon-border-radius, 7px);
		display: flex;
		align-items: center;
	}

	.book-spine-text {
		transform: rotate(90deg);
		white-space: nowrap;
		width: calc(var(--piece-icon-height) - 50px);
		height: calc(var(--piece-icon-thickness) - 2px);
		font-size: calc(1.2rem * var(--piece-icon-scale));
		text-align: center;
		display: flex;
		align-items: center;
		overflow: clip;
		padding-left: 20px;
		background-color: var(--piece-icon-book-color);
	}

	.book-spine-title {
		font-weight: 700;
	}

	.book-spine-author {
		font-weight: 400;
		margin-right: 1em;
	}

	.book-shadow {
		background: rgba(1, 1, 11, 0.54);
		filter: blur(15px);
		width: var(--piece-icon-width);
		height: calc(var(--piece-icon-thickness) * 3);
		transform: rotateX(90deg) rotateY(180deg) translateZ(calc(var(--piece-icon-thickness) * 3 / 2))
			translateY(calc(var(--piece-icon-thickness) * -3 / 2));
		position: absolute;
		outline: solid 1px transparent;
		bottom: 0px;
		left: 0px;
	}
</style>
