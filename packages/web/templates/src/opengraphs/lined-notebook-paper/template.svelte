<script lang="ts">
	import { formatPieceDate } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = { piece: PublicWebPiece; fields: Fields; helpers: PieceComponentHelpers }
	let { piece }: Props = $props()
	const size = { width: 900 }
	const scale = Math.round((size.width / (375 * 2)) * 100) / 100
	const byline = $derived.by(() => {
		const parts: string[] = []
		const minutes = Math.floor((piece.note?.length || 0) / 5 / 250)
		if (minutes > 0) parts.push(`${minutes} min read`)
		const consumed = formatPieceDate(piece.date_consumed)
		if (consumed) parts.push(consumed)
		return parts.join(' · ')
	})
</script>

<section class="container" data-theme="dark">
	<div class="paper-backdrop">
		<section
			class="paper"
			inert
			style="
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

	{#if byline}
		<div class="accent-bar">
			<p class="byline">{byline}</p>
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
		display: flex;
		position: absolute;
		top: 30px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		--paper-hole-color: var(--color-surface-inverse);
	}

	.paper {
		--top-margin-height: calc(0.75in * var(--page-scale));
		--bottom-margin-height: calc(0.5in * var(--page-scale));
		--line-height: calc(52px * var(--page-scale));
		--line-color: lightblue;
		--line-thickness: 1px;
		--left-margin-width: calc(1.25in * var(--page-scale));
		--left-margin-color: #e88484;
		--left-margin-thickness: 1px;
		--hole-radius: calc(3.5mm * var(--page-scale));
		--hole-offset-left: 8%;
		--hole-offset-top-first: calc(1.5in * var(--page-scale));
		--hole-color: var(--paper-hole-color, #333);
		--writing-font-size: calc(var(--line-height) * 0.85);
		--writing-title-font-size: calc(var(--line-height) * 0.85);
		--writing-title-margin-bottom: var(--line-height);
		width: var(--page-width);
		height: var(--page-height);
		background-color: white;
		position: relative;
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
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

	.paper .red-line {
		position: absolute;
		top: 0;
		left: var(--left-margin-width);
		width: var(--left-margin-thickness);
		height: var(--page-height);
		background-color: var(--left-margin-color);
	}

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
