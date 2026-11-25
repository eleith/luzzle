<script lang="ts">
	import type { IconProps } from '../props'
	import type { BookIconFields } from '../fields'

	let { piece, fields, size, helpers, lazy = false }: IconProps<BookIconFields> = $props()
	const scale = $derived(Math.round((size.width / 375) * 100) / 100)
	// Match the built-in spine: 1–650 scaled pages spans 25px to half the cover width.
	const fullness = $derived(Math.max(0, Math.min(1, ((fields.pages ?? 100) * scale - 1) / 649)))
	const depth = $derived((25 + (size.width / 2 - 25) * fullness).toFixed(2))
	const cover = $derived(helpers.getPieceImageUrl(fields.image, size.width, 'jpg'))
	const avif = $derived(helpers.getPieceImageUrl(fields.image, size.width, 'avif'))
</script>

<div
	class="book"
	style:--depth="{depth}px"
	style:--width="{size.width}px"
	style:--height="{size.height ?? (size.width * 3) / 2}px"
	style:--scale={scale}
>
	<div class="book-shadow"></div>
	<div class="book-spine">
		<div class="book-spine-text">
			<span>{fields.author ?? ''}</span>
			<b>{piece.title}</b>
		</div>
	</div>
	<div class="book-pages"></div>
	<div class="book-pages-bottom"></div>
	<div class="book-pages-top"></div>
	<div class="book-back"></div>
	<div class="book-cover">
		<div class="book-cover-front">{piece.title}</div>
		{#if cover}
			<picture>
				{#if avif && avif !== cover}<source srcset={avif} type="image/avif" />{/if}
				<img
					src={cover}
					loading={lazy ? 'lazy' : 'eager'}
					fetchpriority={lazy ? 'auto' : 'high'}
					alt=""
				/>
			</picture>
		{/if}
	</div>
</div>

<style>
	.book {
		--paper: white;
		width: var(--width);
		height: var(--height);
		position: relative;
		color: white;
		transform-style: preserve-3d;
		transform: rotateY(48deg) rotateX(-9deg) rotateZ(-9deg) translateZ(var(--depth))
			translate(-48px, -20px);
	}

	:global([data-active='true']) .book {
		--paper: var(--color-primary);
	}

	/* The transparent outline smooths the silhouette of the rotated faces. */
	.book > div {
		position: absolute;
		outline: 1px solid transparent;
	}

	.book-shadow {
		bottom: 0;
		width: 100%;
		height: calc(var(--depth) * 3);
		background: var(--color-shadow);
		filter: blur(15px);
		transform: rotateX(90deg) rotateY(180deg) translateZ(calc(var(--depth) * 1.5))
			translateY(calc(var(--depth) * -1.5));
	}

	.book-spine {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--depth);
		height: 100%;
		background: black;
		transform: translateX(calc(var(--depth) * -0.5)) translateZ(calc(var(--depth) * -0.5))
			rotateY(-90deg);
	}

	.book-spine-text {
		display: flex;
		align-items: center;
		gap: 1em;
		width: calc(var(--height) - 50px);
		height: calc(var(--depth) - 2px);
		padding-left: 20px;
		white-space: nowrap;
		overflow: clip;
		font-size: calc(1.2rem * var(--scale));
		transform: rotate(90deg);
	}

	.book-pages,
	.book-pages-top,
	.book-pages-bottom {
		background: repeating-linear-gradient(
			var(--angle, 0deg),
			var(--paper) 0%,
			#f9f9f9 5%,
			var(--paper) 10%
		);
	}

	.book-pages {
		--angle: 90deg;
		left: 0;
		top: 3px;
		width: calc(var(--depth) - 10px);
		height: calc(100% - 6px);
		transform: translateX(calc(var(--width) - var(--depth) / 2 - 3px))
			translateZ(calc(var(--depth) * -0.5)) rotateY(90deg);
	}

	.book-pages-bottom,
	.book-pages-top {
		width: calc(100% - 4px);
		height: var(--depth);
	}
	.book-pages-bottom {
		bottom: 0;
		left: 1px;
		transform: translateY(calc(var(--depth) / 2 - 5px)) translateZ(calc(-1px - var(--depth) / 2))
			rotateX(90deg);
	}
	.book-pages-top {
		top: 0;
		right: 1px;
		transform: translateY(calc(5px - var(--depth) / 2)) translateZ(calc(-1px - var(--depth) / 2))
			rotateX(90deg);
	}

	.book-back,
	.book-cover {
		inset: 0;
		background: black;
		border-radius: 0 7px 7px 0;
	}
	.book-back {
		left: 1px;
		width: 100%;
		transform: translateZ(calc(-1 * var(--depth)));
	}
	.book-cover {
		overflow: hidden;
	}
	.book-cover-front {
		display: grid;
		place-items: center;
		position: absolute;
		inset: 0;
		padding: 7px;
		overflow: hidden;
		text-align: center;
		hyphens: auto;
		font-size: calc(3rem * var(--scale));
	}
	.book-cover img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
