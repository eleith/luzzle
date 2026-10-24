<script lang="ts">
	import { formatPieceByline } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = { piece: PublicWebPiece; fields: Fields; helpers: PieceComponentHelpers }
	let { piece, fields, helpers }: Props = $props()
	// A smaller source is sufficient beneath the 80%-opaque background overlay.
	const backdropImage = $derived(
		fields.backdrop ? helpers.getPieceImageUrl(fields.backdrop, 500, 'jpg') : null
	)
	const palette = $derived(helpers.getPiecePalette())
	const posterWidth = 350
	const posterHeight = (posterWidth * 3) / 2
	const posterScale = Math.round((posterWidth / 375) * 100) / 100
	const posterImage = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, posterWidth, 'jpg') : null
	)
	const byline = $derived(
		formatPieceByline(piece.date_consumed, fields.dateReleased, fields.runtime)
	)
	function getTitleSize(title: string): number {
		if (title.length < 10) return 5
		if (title.length < 20) return 4
		if (title.length < 40) return 3.2
		return 2.5
	}
	const titleSize = $derived(getTitleSize(piece.title))
</script>

<section
	class="container"
	style="
		--color-main-text: {palette?.bodyText || 'var(--color-on-surface)'};
		--color-title-text: {palette?.titleText || 'var(--color-on-surface)'};
		--color-background: {palette?.background || 'var(--color-surface-container)'};
		--color-accent: {palette?.accent || 'var(--color-primary)'};"
>
	{#if backdropImage}
		<img class="backdrop-img" src={backdropImage} alt="" />
		<div class="cover"></div>
	{/if}
	<div class="main">
		<div class="left-panel">
			<h1 style="--title-size: {titleSize}rem">
				{piece.title}
			</h1>
			{#if fields.director}
				<h2>by {fields.director}</h2>
			{/if}
		</div>
		<div class="right-panel">
			<div
				class="poster"
				inert
				style="
					--piece-icon-scale: {posterScale};
					--piece-icon-width: {posterWidth}px;
					--piece-icon-height: {posterHeight}px;"
			>
				<div class="poster-title">{piece.title}</div>
				{#if posterImage}
					<img src={posterImage} alt="" />
				{/if}
			</div>
		</div>
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
		width: 100%;
		height: 100%;
		background: var(--color-background);
		border-bottom: 10px solid var(--color-accent);
	}

	.backdrop-img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.cover {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: var(--color-background);
		opacity: 0.8;
	}

	.main {
		display: flex;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.left-panel {
		flex: 5;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		padding: 40px 0 20px 30px;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		color: var(--color-main-text);
	}

	.left-panel h1 {
		max-width: 100%;
		overflow-wrap: anywhere;
		font-size: var(--title-size);
		font-weight: 700;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		line-clamp: 4;
		-webkit-line-clamp: 4;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		color: var(--color-title-text);
	}

	.left-panel h2 {
		max-width: 100%;
		overflow-wrap: anywhere;
		font-size: 1.8rem;
		font-weight: 400;
		margin: 10px 0 0;
		overflow: hidden;
		text-overflow: ellipsis;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		display: -webkit-box;
		-webkit-box-orient: vertical;
	}

	.right-panel {
		flex: 4;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
	}

	.accent-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: oklch(from var(--color-background, var(--color-surface-container)) 0.22 c h);
		color: #fff;
		padding: 15px 30px;
		text-align: left;
		z-index: 1;
	}

	.byline {
		font-size: 1.3rem;
		margin: 0;
		color: inherit;
	}

	.poster {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		display: flex;
		position: relative;
		justify-content: center;
		align-items: center;
		background: white;
		color: black;
		font-size: calc(3rem * var(--piece-icon-scale));
		border: calc(10px * var(--piece-icon-scale)) solid white;
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		text-align: center;
		line-height: 1.2;
		padding: calc(1rem * var(--piece-icon-scale));
		word-break: break-all;
		overflow: hidden;
	}

	.poster-title {
		position: relative;
	}

	.poster img {
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		object-fit: cover;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
</style>
