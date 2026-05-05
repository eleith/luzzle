<script lang="ts">
	import { type PieceIconProps } from '$lib/pieces/helpers'
	let { piece, size, helpers, lazy, active }: PieceIconProps = $props()
	const metadata = piece.metadata

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
	const pages = metadata.pages as number | 100
	const thickness = interpolate(
		pages * scale,
		{ min: 1, max: 650 },
		{ min: 25, max: size.width / 2 }
	)
</script>

<div
	class="book"
	class:active
	inert
	style="
		--book-spine-color: black;
		--book-spine-text-color: white;
		--book-pages-color: {active ? 'var(--color-primary)' : '#fff'};
		--book-book-color: black;
		--book-book-text-color: white;
		--book-transform-display: block;
		--book-transition: transform 0.75s ease;
		--book-scale: {scale};
		--book-shadow-color: transparent;
	  --book-thickness: {thickness}px;
	  --book-width: {size.width}px; 
		--book-height: {(size.width * 3) / 2}px;"
>
	<div class="book-shadow"></div>
	<div class="book-spine">
		<div class="book-spine-text">
			<span class="book-spine-author">
				{metadata.author}
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
		{#if metadata.cover}
			<picture>
				<source
					srcset={helpers.getPieceImageUrl(metadata.cover, size.width, 'avif')}
					type="image/avif"
				/>
				<img
					src={helpers.getPieceImageUrl(metadata.cover, size.width, 'jpg')}
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
		width: var(--book-width);
		height: var(--book-height);
		object-fit: cover;
	}

	@keyframes book-settle {
		from {
			transform: var(
				--book-transform-start,
				rotateY(48deg) rotateX(-9deg) rotateZ(-9deg) translateZ(var(--book-thickness))
					translateX(-48px) translateY(-20px)
			);
		}
	}

	.book {
		width: var(--book-width);
		height: var(--book-height);
		position: relative;
		color: var(--book-book-color);
		transition: var(--book-transition);
		transform-origin: var(--book-transform-origin, center);
		transform: var(
			--book-transform-end,
			var(
				--book-transform-start,
				rotateY(48deg) rotateX(-9deg) rotateZ(-9deg) translateZ(var(--book-thickness))
					translateX(-48px) translateY(-20px)
			)
		);
		box-shadow: -8px 8px 8px var(--book-shadow-color);
		transform-style: preserve-3d;
		animation: book-settle 0.75s ease;
	}

	.book-pages {
		display: var(--book-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		left: 0;
		top: var(--book-page-offset, 3px);
		width: calc(var(--book-thickness) - 10px);
		height: calc(var(--book-height) - 2 * var(--book-page-offset, 3px));
		transform: translateX(
				calc(var(--book-width) - var(--book-thickness) / 2 - var(--book-page-offset, 3px))
			)
			translateZ(calc(0px - var(--book-thickness) / 2)) rotateY(90deg);
		background: linear-gradient(
			90deg,
			var(--book-pages-color) 0%,
			#f9f9f9 5%,
			var(--book-pages-color) 10%,
			#f9f9f9 15%,
			var(--book-pages-color) 20%,
			#f9f9f9 25%,
			var(--book-pages-color) 30%,
			#f9f9f9 35%,
			var(--book-pages-color) 40%,
			#f9f9f9 45%,
			var(--book-pages-color) 50%,
			#f9f9f9 55%,
			var(--book-pages-color) 60%,
			#f9f9f9 65%,
			var(--book-pages-color) 70%,
			#f9f9f9 75%,
			var(--book-pages-color) 80%,
			#f9f9f9 85%,
			var(--book-pages-color) 90%,
			#f9f9f9 95%,
			var(--book-pages-color) 100%
		);
	}

	.book-pages-bottom {
		display: var(--book-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		left: 1px;
		bottom: 0;
		width: calc(var(--book-width) - 4px);
		height: var(--book-thickness);
		transform: translateY(calc(var(--book-thickness) / 2 - 5px))
			translateZ(calc(-1px - var(--book-thickness) / 2)) rotateX(90deg);
		background: linear-gradient(
			0deg,
			var(--book-pages-color) 0%,
			#f9f9f9 5%,
			var(--book-pages-color) 10%,
			#f9f9f9 15%,
			var(--book-pages-color) 20%,
			#f9f9f9 25%,
			var(--book-pages-color) 30%,
			#f9f9f9 35%,
			var(--book-pages-color) 40%,
			#f9f9f9 45%,
			var(--book-pages-color) 50%,
			#f9f9f9 55%,
			var(--book-pages-color) 60%,
			#f9f9f9 65%,
			var(--book-pages-color) 70%,
			#f9f9f9 75%,
			var(--book-pages-color) 80%,
			#f9f9f9 85%,
			var(--book-pages-color) 90%,
			#f9f9f9 95%,
			var(--book-pages-color) 100%
		);
	}

	.book-pages-top {
		display: var(--book-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		right: 1px;
		top: 0px;
		width: calc(var(--book-width) - 4px);
		height: var(--book-thickness);
		transform: translate3D(
				0px,
				calc(0px - (var(--book-thickness) / 2 - 5px)),
				calc(-1px - var(--book-thickness) / 2)
			)
			rotate3D(1, 0, 0, 90deg);
		background: linear-gradient(
			0deg,
			var(--book-pages-color) 0%,
			#f9f9f9 5%,
			var(--book-pages-color) 10%,
			#f9f9f9 15%,
			var(--book-pages-color) 20%,
			#f9f9f9 25%,
			var(--book-pages-color) 30%,
			#f9f9f9 35%,
			var(--book-pages-color) 40%,
			#f9f9f9 45%,
			var(--book-pages-color) 50%,
			#f9f9f9 55%,
			var(--book-pages-color) 60%,
			#f9f9f9 65%,
			var(--book-pages-color) 70%,
			#f9f9f9 75%,
			var(--book-pages-color) 80%,
			#f9f9f9 85%,
			var(--book-pages-color) 90%,
			#f9f9f9 95%,
			var(--book-pages-color) 100%
		);
	}

	.book-spine {
		align-items: center;
		color: var(--book-spine-text-color);
		display: flex;
		font-size: 1.5rem;
		justify-content: center;
		outline: solid 1px transparent;
		width: calc(var(--book-thickness));
		height: var(--book-height);
		transform: translateX(calc(0px - (var(--book-thickness) / 2)))
			translateZ(calc(0px - var(--book-thickness) / 2)) rotateY(-90deg);
		background-color: var(--book-spine-color);
	}

	.book-back {
		display: var(--book-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		top: 0;
		left: 1px;
		width: var(--book-width);
		height: var(--book-height);
		transform: translateZ(calc(0px - var(--book-thickness)));
		background-color: var(--book-book-color);
		border-top-right-radius: var(--book-border-radius, 7px);
		border-bottom-right-radius: var(--book-border-radius, 7px);
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
		font-size: calc(3rem * var(--book-scale));
	}

	.book-cover {
		position: absolute;
		outline: solid 1px transparent;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
		background-color: var(--book-book-color);
		color: var(--book-book-text-color);
		overflow: hidden;
		border-top-right-radius: var(--book-border-radius, 7px);
		border-bottom-right-radius: var(--book-border-radius, 7px);
		display: flex;
		align-items: center;
	}

	.book-spine-text {
		transform: rotate(90deg);
		white-space: nowrap;
		width: calc(var(--book-height) - 50px);
		height: calc(var(--book-thickness) - 2px);
		font-size: calc(1.2rem * var(--book-scale));
		text-align: center;
		display: flex;
		align-items: center;
		overflow: clip;
		padding-left: 20px;
		background-color: var(--book-spine-color);
		color: var(--book-spine-text-color);
	}

	.book-spine-title {
		font-weight: 700;
		display: inline-block;
	}

	.book-spine-author {
		font-weight: 400;
		margin-right: 1em;
		display: inline-block;
	}

	.book-shadow {
		background: var(--color-shadow);
		filter: blur(15px);
		width: var(--book-width);
		height: calc(var(--book-thickness) * 3);
		transform: rotateX(90deg) rotateY(180deg) translateZ(calc(var(--book-thickness) * 3 / 2))
			translateY(calc(var(--book-thickness) * -3 / 2));
		position: absolute;
		outline: solid 1px transparent;
		bottom: 0px;
		left: 0px;
	}
</style>
