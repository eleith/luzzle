<script lang="ts">
	import { formatPieceDate, getOpengraphTitleSize } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = { piece: PublicWebPiece; fields: Fields; helpers: PieceComponentHelpers }
	let { piece, fields, helpers }: Props = $props()
	const palette = $derived(helpers.getPiecePalette())
	const bookWidth = 380
	const bookHeight = (bookWidth * 3) / 2
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, bookWidth, 'jpg') : undefined
	)
	const titleSize = $derived(getOpengraphTitleSize(piece.title))
	const byline = $derived.by(() => {
		const parts: string[] = []
		if (fields.pages !== undefined) parts.push(`${fields.pages} pages`)
		const consumed = formatPieceDate(piece.date_consumed)
		if (consumed) parts.push(consumed)
		return parts.join(' · ')
	})
</script>

<section
	class="container"
	style="
		--color-main-text: {palette?.bodyText || 'var(--color-on-surface)'};
		--color-title-text: {palette?.titleText || 'var(--color-on-surface)'};
		--color-background: {palette?.background || 'var(--color-surface-container)'};
		--color-accent: {palette?.accent || 'var(--color-primary)'};
		--color-muted: {palette?.muted || 'var(--color-surface-container)'};"
>
	<div class="main">
		<div class="left-panel">
			<div
				class="book"
				inert
				style="
					--book-width: {bookWidth}px;
					--book-height: {bookHeight}px;"
			>
				<div class="book-pages">
					<div class="book-page"></div>
					<div class="book-page"></div>
					<div class="book-page"></div>
					<div class="book-page"></div>
				</div>
				<div class="book-cover">
					{#if imageUrl}
						<img src={imageUrl} alt="" />
					{:else}
						<div class="book-cover-front">{piece.title}</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="right-panel">
			<h1 style="--title-size: {titleSize}rem">
				{piece.title}
			</h1>
			{#if fields.author}
				<h2>by {fields.author}</h2>
			{/if}
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
	}

	.main {
		display: flex;
		width: 100%;
		height: 100%;
	}

	.left-panel {
		flex: 4;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
	}

	.right-panel {
		flex: 5;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		min-width: 0;
		padding: 40px 30px 90px 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		color: var(--color-main-text);
	}

	.right-panel h1 {
		font-size: var(--title-size);
		font-weight: 700;
		margin: 0;
		color: var(--color-title-text);
		max-width: 100%;
		max-height: 360px;
		line-height: 1.1;
		overflow-wrap: anywhere;
		overflow: hidden;
		line-clamp: 6;
		-webkit-line-clamp: 6;
		display: -webkit-box;
		-webkit-box-orient: vertical;
	}

	.right-panel h2 {
		font-size: 1.8rem;
		font-weight: 400;
		margin: 10px 0 0;
		max-width: 100%;
		max-height: 2.4em;
		line-height: 1.2;
		overflow-wrap: anywhere;
		overflow: hidden;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		display: -webkit-box;
		-webkit-box-orient: vertical;
	}

	.accent-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		background: oklch(from var(--color-background, var(--color-surface-container)) 0.22 c h);
		color: #fff;
		padding: 15px 30px;
		text-align: right;
		z-index: 1;
		border-bottom: 10px solid var(--color-accent);
	}

	.byline {
		font-size: 1.3rem;
		margin: 0;
		color: inherit;
	}

	.book {
		position: relative;
		width: var(--book-width);
		height: var(--book-height);
	}

	.book-cover {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: black;
		color: white;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		z-index: 5;
		box-shadow: 0 0 40px 10px rgba(0, 0, 0, 0.5);
	}

	.book-cover img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.book-cover-front {
		padding: 20px;
		text-align: center;
		font-size: 2.2rem;
		font-weight: 700;
		line-height: 1.1;
		overflow: hidden;
	}

	.book-pages {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
	}

	.book-page {
		position: absolute;
		width: 100%;
		height: 100%;
		background: #f5f5f0;
		border-radius: 2px;
		border: 1px solid #ddd;
	}

	.book-page:nth-child(1) {
		top: 12px;
		left: 12px;
	}

	.book-page:nth-child(2) {
		top: 9px;
		left: 9px;
	}

	.book-page:nth-child(3) {
		top: 6px;
		left: 6px;
	}

	.book-page:nth-child(4) {
		top: 3px;
		left: 3px;
	}
</style>
