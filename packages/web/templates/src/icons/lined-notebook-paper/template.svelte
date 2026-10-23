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
	let { piece, size, active = false }: Props = $props()
	const scale = $derived(Math.round((size.width / (375 * 2)) * 100) / 100)
	const height = $derived(size.height ?? size.width * (11 / 8.5))
</script>

<section
	class="paper"
	class:active
	inert
	style="
		--page-scale: {scale};
		--page-width:{size.width}px;
		--page-height:{height}px;"
>
	<div class="red-line"></div>
	<div class="hole-3"></div>
	<div class="writing">
		<div class="title">
			{piece.title}
		</div>
		<div class="summary">
			{piece.summary}
		</div>
	</div>
</section>

<style>
	.active {
		outline: 1px solid var(--color-primary);
	}

	.paper {
		--page-scale: 1;

		--page-width: calc(8.5in * var(--page-scale));
		--page-height: calc(var(--page-width) * 11 / 8.5);

		--top-margin-height: calc(0.75in * var(--page-scale));
		--bottom-margin-height: calc(0.5in * var(--page-scale));

		--line-height: calc(52px * var(--page-scale));
		--line-color: lightblue;
		--line-thickness: 1px;

		--left-margin-width: calc(1.25in * var(--page-scale));
		--left-margin-color: #e88484;
		--left-margin-thickness: 1px;

		--hole-radius: calc(3.5mm * var(--page-scale));
		--hole-spacing: 33%;
		--hole-offset-left: 8%;
		--hole-offset-top-first: 15%;
		--hole-color: var(--paper-hole-color, #333);

		--writing-font-size: calc(var(--line-height) * 0.85);
		--writing-title-font-size: calc(var(--line-height) * 0.85);
		--writing-title-margin-bottom: var(--line-height);

		width: var(--page-width);
		height: var(--page-height);

		background-color: white;
		position: relative;
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		overflow: hidden;
		flex-shrink: 0;

		background-image: repeating-linear-gradient(
			to bottom,
			var(--line-color) 0,
			var(--line-color) var(--line-thickness),
			transparent var(--line-thickness),
			transparent var(--line-height)
		);

		background-position: 0 var(--top-margin-height);
		background-size: 100%
			calc(var(--page-height) - var(--top-margin-height) - var(--bottom-margin-height));
		background-repeat: repeat-x;

		border-radius: calc(9px * var(--page-scale));
	}

	.paper .writing {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 100%;
		padding-left: 20%;
		padding-right: 5%;
		color: #333;
		font-size: var(--writing-font-size);
		display: flex;
		flex-direction: column;
	}

	.paper .writing .title {
		font-size: var(--writing-title-font-size);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		line-height: var(--writing-title-font-size);
		margin-top: calc(var(--top-margin-height) + var(--line-height) * 0.3);
		margin-bottom: var(--writing-title-margin-bottom);
		min-height: var(--writing-title-font-size);
		font-weight: bold;
	}

	.paper .writing .summary {
		line-height: var(--line-height);
		overflow: hidden;
		font-weight: 300;
	}

	.paper .red-line {
		position: absolute;
		top: 0;
		left: var(--left-margin-width);
		width: var(--left-margin-thickness);
		height: 100%;
		background-color: var(--left-margin-color);
	}

	.paper::before,
	.paper::after,
	.paper .hole-3 {
		content: '';
		position: absolute;
		left: var(--hole-offset-left);
		width: calc(var(--hole-radius) * 2);
		height: calc(var(--hole-radius) * 2);
		background-color: var(--hole-color);
		border-radius: 50%;
		transform: translateX(-50%);
	}

	.paper::before {
		top: var(--hole-offset-top-first);
	}

	.paper::after {
		top: calc(var(--hole-offset-top-first) + var(--hole-spacing));
	}

	.paper .hole-3 {
		top: calc(var(--hole-offset-top-first) + (var(--hole-spacing) * 2));
	}
</style>
