<script lang="ts">
	import { formatPieceDate, formatTrackDuration, getOpengraphTitleSize } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = { piece: PublicWebPiece; fields: Fields; helpers: PieceComponentHelpers }
	let { piece, fields, helpers }: Props = $props()
	const palette = $derived(helpers.getPiecePalette())
	const iconWidth = 700
	// The cover art fills only the vinyl label (55% of the disc width).
	const labelImageWidth = 400
	const iconScale = Math.round((iconWidth / 458) * 100) / 100
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, labelImageWidth, 'jpg') : undefined
	)
	const titleSize = $derived(getOpengraphTitleSize(piece.title))
	const byline = $derived.by(() => {
		const parts: string[] = []
		const duration = formatTrackDuration(fields.durationSeconds)
		if (duration) parts.push(`${duration} (min:sec)`)
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
		--color-accent: {palette?.accent || 'var(--color-primary)'};"
>
	<div class="main">
		<div class="left-panel">
			<h1 style="--title-size: {titleSize}rem">
				{piece.title}
			</h1>
			{#if fields.artist}
				<h2>by {fields.artist}</h2>
			{/if}
		</div>
		<div class="right-panel">
			<div
				class="vinyl-container"
				inert
				style="
					--piece-icon-scale: {iconScale};
					--piece-icon-width: {iconWidth}px;
					--piece-icon-height: {iconWidth}px;"
			>
				<div class="vinyl-disc">
					<div class="vinyl-grooves"></div>
					<div class="vinyl-label">
						{#if imageUrl}
							<img src={imageUrl} alt="" />
						{:else}
							<div class="vinyl-label-fallback">
								<span>{piece.title}</span>
							</div>
						{/if}
					</div>
					<div class="vinyl-hole"></div>
					<div class="vinyl-glare"></div>
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
		overflow: hidden;
	}

	.main {
		display: flex;
		width: 100%;
		height: 100%;
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
		position: relative;
		overflow: visible;
		margin-right: -200px;
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

	.vinyl-container {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
	}

	.vinyl-disc {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background-color: #111;
		position: relative;
		box-shadow: calc(3px * var(--piece-icon-scale)) calc(6px * var(--piece-icon-scale))
			calc(8px * var(--piece-icon-scale)) var(--color-shadow);
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.vinyl-grooves {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 50%;
		background: repeating-radial-gradient(#111 0, #111 2px, #222 3px, #111 4px);
	}

	.vinyl-label {
		width: 55%;
		height: 55%;
		border-radius: 50%;
		background-color: #eee;
		position: relative;
		overflow: hidden;
		border: calc(6px * var(--piece-icon-scale)) solid rgba(255, 255, 255, 0.1);
	}

	.vinyl-label img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.vinyl-label-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		font-size: calc(12px * var(--piece-icon-scale));
		color: #333;
		padding: 10px;
		background: #f0f0f0;
	}

	.vinyl-hole {
		position: absolute;
		width: 3%;
		height: 3%;
		background-color: #fff;
		border-radius: 50%;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.5);
	}

	.vinyl-glare {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0) 40%,
			rgba(255, 255, 255, 0.1) 50%,
			rgba(255, 255, 255, 0) 60%,
			rgba(255, 255, 255, 0) 100%
		);
		pointer-events: none;
	}
</style>
