<script lang="ts">
	import { type PieceIconProps } from '$lib/pieces/helpers'
	let { piece, size, active }: PieceIconProps = $props()

	const scale = Math.round((size.width / (375 * 2)) * 100) / 100
</script>

<section
	class="paper"
	class:active
	inert
	style="
		--page-scale: {scale};
		--page-width:{size.width}px;
		--page-height:{size.height || size.width * (11 / 8.5)}px;"
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
		/* Base unit for scaling */
		--page-scale: 1;

		/* Page dimensions based on scale */
		--page-width: calc(8.5in * var(--page-scale));
		--page-height: calc(var(--page-width) * 11 / 8.5);

		/* Margins */
		--top-margin-height: calc(0.75in * var(--page-scale));
		--bottom-margin-height: calc(0.5in * var(--page-scale));

		/* Line properties based on scale */
		--line-height: calc(52px * var(--page-scale)); /* Standard college rule */
		--line-color: lightblue;
		--line-thickness: 1px; /* CHANGED: Set to 1px for render stability */

		/* Margin properties based on scale */
		--left-margin-width: calc(1.25in * var(--page-scale));
		--left-margin-color: #e88484; /* A softer red */
		--left-margin-thickness: 1px; /* CHANGED: Set to 1px for render stability */

		/* Hole punch properties based on scale */
		--hole-radius: calc(3.5mm * var(--page-scale));
		--hole-spacing: calc(108mm * var(--page-scale)); /* Approx. standard 3-hole punch spacing */
		--hole-spacing: 33%; /* Approx. standard 3-hole punch spacing */
		--hole-offset-left: calc(0.5in * var(--page-scale)); /* Distance from left edge of paper */
		--hole-offset-left: 8%;
		--hole-offset-top-first: calc(
			1in * var(--page-scale)
		); /* Distance from top edge to center of first hole */
		--hole-offset-top-first: 15%;
		--hole-color: var(--paper-hole-color, #333);

		--writing-font-size: calc(var(--line-height) * 0.85);
		--writing-title-font-size: calc(var(--line-height) * 0.85);
		--writing-title-margin-bottom: var(--line-height);

		/* Use variables for width and height */
		width: var(--page-width);
		height: var(--page-height);

		background-color: white;
		position: relative; /* Needed for absolute positioning of holes */
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		overflow: hidden; /* Ensure nothing spills out */
		flex-shrink: 0; /* Prevent paper from shrinking smaller than its width/height */

		/* 1. Stack the background images */
		background-image: repeating-linear-gradient(
			to bottom,
			var(--line-color) 0,
			var(--line-color) var(--line-thickness),
			transparent var(--line-thickness),
			transparent var(--line-height)
		);

		/* 2. Position each background */
		background-position: 0 var(--top-margin-height); /* Blue lines: position at left 0, offset from top */

		/* 3. Size of each background */
		background-size: 100%
			calc(var(--page-height) - var(--top-margin-height) - var(--bottom-margin-height)); /* Blue lines: full width, and content height (page height - margins) */

		/* 4. Repeat for each background */
		background-repeat: repeat-x; /* Blue lines: repeat-x to fill width. The 'repeating-linear-gradient' fills the vertical space of its box. */

		border-radius: calc(9px * var(--page-scale));
	}

	/* Rule for the red line div */
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

	/* Rule for the red line div */
	.paper .red-line {
		position: absolute;
		top: 0;
		left: var(--left-margin-width);
		width: var(--left-margin-thickness);
		height: 100%;
		background-color: var(--left-margin-color);
	}

	/* Hole Punches - Using pseudo-elements and a div */
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
		/* Center the hole horizontally based on its left edge */
		transform: translateX(-50%);
	}

	.paper::before {
		/* First hole */
		top: var(--hole-offset-top-first);
	}

	.paper::after {
		/* Second hole */
		top: calc(var(--hole-offset-top-first) + var(--hole-spacing));
	}

	.paper .hole-3 {
		/* Third hole */
		top: calc(var(--hole-offset-top-first) + (var(--hole-spacing) * 2));
	}
</style>
