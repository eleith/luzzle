<script lang="ts">
	import { formatPieceDate, getOpengraphTitleSize } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = { piece: PublicWebPiece; fields: Fields; helpers: PieceComponentHelpers }
	let { piece, fields, helpers }: Props = $props()
	const palette = $derived(helpers.getPiecePalette())
	const iconWidth = 400
	const iconHeight = (iconWidth * 3) / 2
	const iconScale = Math.round((iconWidth / 375) * 100) / 100
	const titleSize = $derived(getOpengraphTitleSize(piece.title))
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, iconWidth, 'jpg') : undefined
	)
	// Preserve the original image backdrop unless an independent backdrop is mapped.
	const backdrop = $derived(fields.backdrop ?? fields.image)
	const backdropUrl = $derived(
		backdrop ? helpers.getPieceImageUrl(backdrop, 500, 'jpg') : undefined
	)

	/** Video play time is rounded to whole hours, as in the production cartridge. */
	function formatVideoPlayTime(minutes: number | undefined): string | undefined {
		return minutes === undefined ? undefined : `${Math.round(minutes / 60)} hrs`
	}

	const byline = $derived.by(() => {
		const parts: string[] = []
		if (fields.platform) parts.push(fields.platform)
		const playTime = formatVideoPlayTime(fields.playTimeMinutes)
		if (playTime) parts.push(playTime)
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
	{#if backdropUrl}
		<img class="backdrop-img" src={backdropUrl} alt="" />
		<div class="cover"></div>
	{/if}
	<div class="main">
		<div class="left-panel">
			<h1 style="--title-size: {titleSize}rem">
				{piece.title}
			</h1>
			{#if fields.publisher}
				<h2>from {fields.publisher}</h2>
			{/if}
		</div>
		<div class="right-panel right-panel-video">
			<div
				class="cartridge-container"
				inert
				style="
					--game-scale: {iconScale};
					--game-width: {iconWidth}px;
					--game-height: {iconHeight}px;"
			>
				<div class="cartridge">
					<div class="cartridge-top"></div>
					<div class="cartridge-header">
						<div class="cartridge-header-overlay">
							<div class="cartridge-brand">
								<span class="cartridge-brand-name">{piece.title}</span>
							</div>
						</div>
					</div>
					<div class="cartridge-body">
						<div class="cartridge-end"></div>
						<div class="cartridge-label-container">
							<div class="cartridge-gap">
								<div class="cartridge-image-container">
									{#if imageUrl}
										<img src={imageUrl} alt="" />
									{/if}
								</div>
							</div>
							<div class="cartridge-arrow-down"></div>
						</div>
						<div class="cartridge-end"></div>
					</div>
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
		width: 1200px;
		height: 630px;
		box-sizing: border-box;
		overflow: hidden;
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
		box-sizing: border-box;
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
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
	}

	.right-panel-video {
		align-self: flex-end;
		transform: translateY(11%);
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

	/* Cartridge styles */
	.cartridge-container {
		--game-border-radius: 7px;
		position: relative;
		width: var(--game-width);
	}

	.cartridge {
		width: var(--game-width);
		box-shadow: 8px 8px 8px var(--color-shadow);
		border-radius: 0 0 var(--game-border-radius) var(--game-border-radius);
	}

	.cartridge-top {
		width: calc(var(--game-width) * 0.9);
		height: calc(var(--game-width) * 1.25 * 0.02);
		background: #8c8c8c;
		border-radius: var(--game-border-radius) var(--game-border-radius) 0 0;
		box-shadow: 0px -2px 0px var(--color-shadow);
	}

	.cartridge-body {
		width: var(--game-width);
		background: #8c8c8c;
		border-radius: 0 0 var(--game-border-radius) var(--game-border-radius);
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		background-image: linear-gradient(transparent, #666);
	}

	.cartridge-label-container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cartridge-end {
		width: 5%;
		height: calc(var(--game-width) * 1.25 * 0.35);
		background: #5d5d5d;
		border-top: 3px solid #444;
	}

	.cartridge-end:first-child {
		border-radius: 0 0 0 var(--game-border-radius);
	}

	.cartridge-end:last-child {
		border-radius: 0 0 var(--game-border-radius) 0;
	}

	.cartridge-gap {
		width: calc(var(--game-width) * 0.74);
		height: calc(var(--game-width) * 0.74);
		background: #666;
		background-image: linear-gradient(#666, #555);
		border-radius: var(--game-border-radius);
		display: flex;
		justify-content: center;
		align-items: center;
		border-top: 2px solid #444;
		border-bottom: 2px solid #aaa;
		overflow: hidden;
	}

	.cartridge-arrow-down {
		border-top: 1px solid #555;
		border-left: 1px solid transparent;
		border-right: 1px solid transparent;
		border-width: calc(var(--game-width) * 0.1);
		border-radius: 10px;
		margin: 8px 0 8px 0;
		filter: drop-shadow(0 1px 0 #999) drop-shadow(0 -1px 0 #444);
	}

	.cartridge-header {
		justify-content: center;
		width: calc(var(--game-width) * 1);
		height: calc(var(--game-width) * 1.25 * 0.12);
		background: linear-gradient(#8c8c8c 0 15%, transparent 15% 75%, #8c8c8c 75%),
			linear-gradient(90deg, transparent 0 1%, #444 1% 5%, #000 50%, #444 95% 99%, transparent 99%);
		border-radius: 0 var(--game-border-radius) 0 0;
		display: flex;
		align-items: center;
	}

	.cartridge-header-overlay {
		width: 100%;
		height: 75%;
		display: flex;
		justify-content: center;
		align-items: center;
		background: repeating-linear-gradient(#8c8c8c 0 10%, transparent 10% 20%);
	}

	.cartridge-brand {
		width: 78%;
		height: 100%;
		background: linear-gradient(#444 5%, #707070 85%);
		box-shadow:
			0 5px 15px 10px #4448 inset,
			0 -1px 0 1px #ddd inset,
			0 1px 2px 2px #222 inset;
		border: clamp(0px, 5%, 5px) solid #8c8c8c;
		border-radius: 75px;
		transform: translate(0, 3%);
		display: flex;
		justify-content: center;
		align-items: center;
		color: #fff;
		text-shadow: 1px 2px 1px #0005;
		overflow: hidden;
	}

	.cartridge-brand-name {
		font-size: calc(1rem * var(--game-scale));
		letter-spacing: 0px;
		display: inline-block;
		padding-left: calc(7px * var(--game-scale));
		padding-right: calc(7px * var(--game-scale));
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.cartridge-image-container img {
		width: calc(var(--game-width) * 0.67);
		height: calc(var(--game-width) * 0.67);
		object-fit: cover;
		border-radius: var(--game-border-radius);
		object-position: top;
	}
</style>
