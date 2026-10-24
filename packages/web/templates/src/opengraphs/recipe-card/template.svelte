<script lang="ts">
	import { formatPieceDate, getOpengraphTitleSize } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = { piece: PublicWebPiece; fields: Fields; helpers: PieceComponentHelpers }
	let { piece, fields, helpers }: Props = $props()
	const palette = $derived(helpers.getPiecePalette())
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 500, 'jpg') : undefined
	)
	const ingredients = $derived(fields.ingredients ?? [])
	const titleSize = $derived(getOpengraphTitleSize(piece.title))
	function getTotalMinutes(value: Fields): number | undefined {
		if (value.totalMinutes !== undefined) return value.totalMinutes
		if (value.prepMinutes === undefined && value.cookMinutes === undefined) return undefined
		return (value.prepMinutes ?? 0) + (value.cookMinutes ?? 0)
	}
	const totalTime = $derived(getTotalMinutes(fields))
	const byline = $derived.by(() => {
		const parts: string[] = []
		if (totalTime !== undefined) parts.push(`${totalTime} min`)
		if (ingredients.length) parts.push(`${ingredients.length} ingredients`)
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
		--notepad-line-height: 48px;
		--notepad-padding-x: 24px;
		--notepad-padding-y: 20px;"
>
	{#if imageUrl}
		<img class="backdrop-img" src={imageUrl} alt="" />
		<div class="cover"></div>
	{/if}
	<div class="main">
		<div class="left-panel">
			<h1 style="--title-size: {titleSize}rem">
				{piece.title}
			</h1>
			{#if fields.source}
				<h2>from {fields.source}</h2>
			{/if}
		</div>
		<div class="right-panel">
			<div class="notepad" inert>
				<div class="notepad-header">ingredients</div>
				<div class="notepad-body">
					{#each ingredients as ingredient}
						<div class="notepad-line">
							<span class="checkbox"></span>
							<span class="ingredient-text">{ingredient.item}</span>
						</div>
					{/each}
				</div>
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
		align-items: flex-end;
		justify-content: center;
		z-index: 2;
		padding-top: 20%;
	}

	.notepad {
		width: 100%;
		height: 100%;
		background: #fffef5;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: -6px 4px 16px rgba(0, 0, 0, 0.35);
		border-radius: 6px 0 0 0;
	}

	.notepad-header {
		padding: var(--notepad-padding-y) var(--notepad-padding-x);
		padding-bottom: calc(var(--notepad-padding-y) * 0.75);
		font-size: 1.3rem;
		font-weight: 600;
		color: #555;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		border-bottom: 2px solid #ddd;
	}

	.notepad-body {
		flex: 1;
		overflow: hidden;
		padding-top: calc(var(--notepad-padding-y) * 0.5);
		background: repeating-linear-gradient(
			transparent,
			transparent calc(var(--notepad-line-height) - 1px),
			#e0ddd5 calc(var(--notepad-line-height) - 1px),
			#e0ddd5 var(--notepad-line-height)
		);
	}

	.notepad-line {
		display: flex;
		align-items: center;
		gap: 12px;
		height: var(--notepad-line-height);
		padding: 0 var(--notepad-padding-x);
		font-size: 1.1rem;
		color: #333;
	}

	.checkbox {
		width: 16px;
		height: 16px;
		border: 2px solid #bbb;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.ingredient-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
</style>
