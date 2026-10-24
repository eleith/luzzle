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
	const backdropUrl = $derived(
		fields.backdrop ? helpers.getPieceImageUrl(fields.backdrop, 500, 'jpg') : undefined
	)

	const cardColors = $derived.by(() => {
		let background = 'var(--color-surface-container)'
		let text = 'var(--color-on-surface)'
		let icon = 'var(--color-primary)'
		let iconText = 'var(--color-on-primary)'
		if (palette?.muted) {
			background = `oklch(from ${palette.muted} 0.85 c h)`
			text = 'oklch(from var(--color-on-surface) 0.2 c h)'
		}
		if (palette?.accent) {
			icon = `oklch(from ${palette.accent} 0.22 c h)`
			iconText = 'oklch(from var(--color-on-primary) 0.98 c h)'
		}
		return { background, text, icon, iconText, border: palette?.accent || 'var(--color-primary)' }
	})

	// Phosphor shield, dice, trophy, moon, crown, sword, and coins (inline for Takumi).
	const symbolPaths: readonly string[] = [
		'M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40ZM167.4,201.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81,111.82,111.82,0,0,1-24.51-27.64L128,129.77l63.43,44.4A111.56,111.56,0,0,1,167.4,201.42ZM208,112q0,26.31-9.14,47.84l-66.27-46.39a8,8,0,0,0-9.18,0L57.13,159.84C51.06,145.52,48,129.54,48,112l0-56,160,0Z',
		'M192,32H64A32,32,0,0,0,32,64V192a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V64A32,32,0,0,0,192,32Zm16,160a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H192a16,16,0,0,1,16,16ZM104,92A12,12,0,1,1,92,80,12,12,0,0,1,104,92Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,92Zm-72,72a12,12,0,1,1-12-12A12,12,0,0,1,104,164Zm36-36a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm36,36a12,12,0,1,1-12-12A12,12,0,0,1,176,164Z',
		'M232,64H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V64H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8Zm144-8.9c0,35.52-29,64.64-64,64.9a64,64,0,0,1-64-64V56H192ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z',
		'M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z',
		'M248,80a28,28,0,1,0-51.12,15.77l-26.79,33L146,73.4a28,28,0,1,0-36.06,0L85.91,128.74l-26.79-33a28,28,0,1,0-26.6,12L47,194.63A16,16,0,0,0,62.78,208H193.22A16,16,0,0,0,209,194.63l14.47-86.85A28,28,0,0,0,248,80ZM128,40a12,12,0,1,1-12,12A12,12,0,0,1,128,40ZM24,80A12,12,0,1,1,36,92,12,12,0,0,1,24,80ZM193.22,192H62.78L48.86,108.52,81.79,149A8,8,0,0,0,88,152a7.83,7.83,0,0,0,1.08-.07,8,8,0,0,0,6.26-4.74l29.3-67.4a27,27,0,0,0,6.72,0l29.3,67.4a8,8,0,0,0,6.26,4.74A7.83,7.83,0,0,0,168,152a8,8,0,0,0,6.21-3l32.93-40.52ZM220,92a12,12,0,1,1,12-12A12,12,0,0,1,220,92Z',
		'M216,32H152a8,8,0,0,0-6.34,3.12l-64,83.21L72,108.69a16,16,0,0,0-22.64,0l-12.69,12.7a16,16,0,0,0,0,22.63l20,20-28,28a16,16,0,0,0,0,22.63l12.69,12.68a16,16,0,0,0,22.62,0l28-28,20,20a16,16,0,0,0,22.64,0l12.69-12.7a16,16,0,0,0,0-22.63l-9.64-9.64,83.21-64A8,8,0,0,0,224,104V40A8,8,0,0,0,216,32ZM52.69,216,40,203.32l28-28L80.68,188Zm70.61-8L48,132.71,60.7,120,136,195.31ZM208,100.06l-81.74,62.88L115.32,152l50.34-50.34a8,8,0,0,0-11.32-11.31L104,140.68,93.07,129.74,155.94,48H208Z',
		'M184 89.57V84c0-25.08-37.83-44-88-44S8 58.92 8 84v40c0 20.89 26.25 37.49 64 42.46V172c0 25.08 37.83 44 88 44s88-18.92 88-44v-40c0-20.7-25.42-37.32-64-42.43M232 132c0 13.22-30.79 28-72 28c-3.73 0-7.43-.13-11.08-.37C170.49 151.77 184 139 184 124v-18.26c29.87 4.45 48 16.53 48 26.26M72 150.25v-23.79A184 184 0 0 0 96 128a184 184 0 0 0 24-1.54v23.79A163 163 0 0 1 96 152a163 163 0 0 1-24-1.75m96-40.32V124c0 8.39-12.41 17.4-32 22.87V123.5c12.91-3.13 23.84-7.79 32-13.57M96 56c41.21 0 72 14.78 72 28s-30.79 28-72 28s-72-14.78-72-28s30.79-28 72-28m-72 68v-14.07c8.16 5.78 19.09 10.44 32 13.57v23.37C36.41 141.4 24 132.39 24 124m64 48v-4.17c2.63.1 5.29.17 8 .17c3.88 0 7.67-.13 11.39-.35a122 122 0 0 0 12.61 3.76v23.46c-19.59-5.47-32-14.48-32-22.87m48 26.25V174.4a179.5 179.5 0 0 0 24 1.6a184 184 0 0 0 24-1.54v23.79a165.5 165.5 0 0 1-48 0m64-3.38V171.5c12.91-3.13 23.84-7.79 32-13.57V172c0 8.39-12.41 17.4-32 22.87'
	]

	function getCardSymbolPath(title: string): string {
		const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0)
		return symbolPaths[hash % symbolPaths.length]!
	}
	const symbolPath = $derived(getCardSymbolPath(piece.title))

	/** Tabletop play time retains minutes rather than rounding to hours. */
	function formatTabletopPlayTime(minutes: number | undefined): string | undefined {
		return minutes === undefined ? undefined : `${minutes} min`
	}

	const byline = $derived.by(() => {
		const parts: string[] = []
		const playTime = formatTabletopPlayTime(fields.playTimeMinutes)
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
		<div class="right-panel">
			<div
				class="cards-container"
				inert
				style="
					--game-scale: {iconScale};
					--game-width: {iconWidth}px;
					--game-height: {iconHeight}px;
					--game-card-color-bg: {cardColors.background};
					--game-card-color-text: {cardColors.text};
					--game-card-color-border: {cardColors.border};
					--game-card-icon-color: {cardColors.icon};
					--game-card-icon-text-color: {cardColors.iconText};"
			>
				<div class="card" style="transform: rotate(33deg); position: absolute;">
					<div class="card-image-container">{piece.title.toUpperCase()}</div>
					<div class="card-divider">{piece.summary || ''}</div>
				</div>

				<div class="card" style="transform: rotate(15deg); position: absolute;">
					<div class="card-image-container">{piece.title.toUpperCase()}</div>
					<div class="card-divider">{piece.summary || ''}</div>
				</div>

				<div class="card">
					<div class="card-image-container">
						<div class="card-title">{piece.title.toUpperCase()}</div>
					</div>
					<div class="card-icon">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
							<path d={symbolPath}></path>
						</svg>
					</div>
					<div class="card-divider">{piece.summary || ''}</div>
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

	/* Card styles */
	.cards-container {
		width: var(--game-width);
		height: var(--game-height);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card {
		flex-shrink: 0;
		border-radius: calc(22px * var(--game-scale));
		flex-direction: column;
		display: flex;
		position: relative;
		width: calc(var(--game-width) * 0.75);
		transform: rotate(-17deg);
		box-shadow: calc(8px * var(--game-scale)) calc(8px * var(--game-scale))
			calc(8px * var(--game-scale)) var(--color-shadow);
	}

	.card-image-container {
		height: calc(var(--game-height) * 0.75 * 0.75);
		display: flex;
		border-top-left-radius: calc(16px * var(--game-scale));
		border-top-right-radius: calc(16px * var(--game-scale));
		width: 100%;
		align-items: center;
		justify-content: center;
		background: var(--game-card-color-bg);
		color: var(--game-card-color-text);
		font-size: calc(2rem * var(--game-scale));
		position: relative;
		overflow-wrap: break-word;
		word-break: break-word;
		overflow: hidden;
	}

	.card-title {
		position: relative;
		padding: calc(10px * var(--game-scale));
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		overflow-wrap: break-word;
		word-break: break-word;
	}

	.card-icon {
		border-radius: 50px;
		width: calc(45px * var(--game-scale));
		height: calc(45px * var(--game-scale));
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		top: calc(var(--game-height) * 0.75 * 0.75 - calc(45px * var(--game-scale)) / 2);
		left: calc(var(--game-width) * 0.75 * 0.5 - calc(45px * var(--game-scale)) / 2);
		background: var(--game-card-icon-color);
		border: calc(3px * var(--game-scale)) solid var(--game-card-icon-text-color);
		z-index: 1;
	}

	.card-icon svg {
		fill: var(--game-card-icon-text-color);
		width: calc(32px * var(--game-scale));
		height: calc(32px * var(--game-scale));
	}

	.card-divider {
		box-sizing: border-box;
		flex-shrink: 0;
		height: calc(var(--game-height) * 0.75 * 0.25);
		text-align: center;
		border-top: calc(5px * var(--game-scale)) solid
			var(--game-card-color-border, var(--color-accent));
		border-bottom-left-radius: calc(16px * var(--game-scale));
		border-bottom-right-radius: calc(16px * var(--game-scale));
		padding-left: calc(10px * var(--game-scale));
		padding-right: calc(10px * var(--game-scale));
		padding-top: calc(20px * var(--game-scale));
		border-bottom: solid calc(20px * var(--game-scale)) transparent;
		background: var(--color-surface);
		color: var(--color-on-surface);
		font-size: calc(0.75rem * var(--game-scale));
		overflow: hidden;
		line-height: calc(1.25rem * var(--game-scale));
	}
</style>
