<script lang="ts">
	const { piece }: PieceOpengraphProps = $props()
	const minutes = Math.floor(((piece.note?.length || 0) as number) / 5 / 250)

	const size = { width: 900 }
	const scale = Math.round((size.width / (375 * 2)) * 100) / 100

	const bylineParts: string[] = []
	if (minutes > 0) bylineParts.push(`${minutes} min read`)
	if (piece.date_consumed) {
		bylineParts.push(
			new Date(piece.date_consumed)
				.toLocaleDateString('en-US', { timeZone: 'UTC' })
				.replaceAll('/', '.')
		)
	}
</script>

<section class="container" data-theme="dark">
	<div class="paper-backdrop">
		<section
			class="paper"
			inert
			style="
				background-position: 0 var(--top-margin-height);
				--page-scale: {scale};
				--page-width:{size.width}px;
				--page-height:{size.width * (11 / 8.5)}px;"
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
	</div>

	{#if bylineParts.length}
		<div class="accent-bar">
			<p class="byline">{bylineParts.join(' · ')}</p>
		</div>
	{/if}
</section>

<style>
	section.container {
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		width: 100%;
		height: 100%;
		background: var(--color-surface-inverse);
		border-bottom: 10px solid var(--color-primary);
		overflow: hidden;
	}

	.paper-backdrop {
		/* takumi: `display: flex` is the workaround for the all-abs-children
		   bug — without it, `.paper` (only-abs children) silently fails to
		   render inside this block-context wrapper. See
		   takumi-block-wrapper-abs-children-issue.md at repo root. */
		display: flex;
		position: absolute;
		top: 30px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		--paper-hole-color: var(--color-surface-inverse);
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
			1.5in * var(--page-scale)
		); /* Distance from top edge to center of first hole */
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

	.paper .writing {
		position: absolute;
		top: 0;
		left: 0;
		height: var(--page-height);
		width: var(--page-width);
		padding-left: calc(var(--page-width) * 0.2);
		padding-right: calc(var(--page-width) * 0.05);
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

	/* takumi bug workaround: `height: 100%` swapped for `var(--page-height)`. */
	.paper .red-line {
		position: absolute;
		top: 0;
		left: var(--left-margin-width);
		width: var(--left-margin-thickness);
		height: var(--page-height);
		background-color: var(--left-margin-color);
	}

	/* Hole Punches - Using pseudo-elements and a div */

	.paper .hole-3 {
		position: absolute;
		top: var(--hole-offset-top-first);
		left: var(--hole-offset-left);
		width: calc(var(--hole-radius) * 2);
		height: calc(var(--hole-radius) * 2);
		background-color: var(--hole-color);
		border-radius: 50%;
		transform: translateX(-50%);
	}

	.accent-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: oklch(from var(--color-surface-container) l c h / 0.96);
		padding: 10px 30px;
		text-align: right;
		z-index: 2;
	}

	.byline {
		font-size: 1.3rem;
		margin: 8px 0 0;
		color: var(--color-on-surface-variant);
	}
</style>
