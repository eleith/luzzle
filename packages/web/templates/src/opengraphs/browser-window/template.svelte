<script lang="ts">
	import { formatPieceDate, getOpengraphTitleSize } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = { piece: PublicWebPiece; fields: Fields; helpers: PieceComponentHelpers }
	let { piece, fields, helpers }: Props = $props()
	const palette = $derived(helpers.getPiecePalette())
	const iconWidth = 550
	const iconHeight = (iconWidth * 3) / 2
	const iconScale = Math.round((iconWidth / 375) * 100) / 100
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, iconWidth, 'jpg') : undefined
	)
	const displayUrl = $derived(fields.url || helpers.getPieceUrl())
	const titleSize = $derived(getOpengraphTitleSize(piece.title))
	function getBylineHostname(url?: string): string | undefined {
		if (!url) return undefined
		try {
			const hostname = new URL(url).hostname.replace(/^www\./, '').replace(/\.com$/, '')
			if (hostname.length <= 25) return hostname
		} catch {
			// Invalid URLs remain displayable, but do not contribute a hostname.
		}
		return undefined
	}
	const byline = $derived.by(() => {
		const parts: string[] = []
		if (!fields.author) {
			const hostname = getBylineHostname(fields.url)
			if (hostname) parts.push(hostname)
		}
		if (fields.wordCount) parts.push(`${Math.max(1, Math.round(fields.wordCount / 250))} min`)
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
			<div class="icon-container">
				<div
					class="browser-container"
					inert
					style="
						--piece-icon-scale: {iconScale};
						--piece-icon-width: {iconWidth}px;
						--piece-icon-height: {iconHeight}px;"
				>
					<div class="browser-mockup">
						<div class="browser-window-bar">
							<div class="browser-controls">
								<div class="browser-control-dot red"></div>
								<div class="browser-control-dot yellow"></div>
								<div class="browser-control-dot green"></div>
							</div>
						</div>
						<div class="browser-url-bar">
							<div class="browser-address-input">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="32"
									height="32"
									fill="currentColor"
									viewBox="0 0 256 256"
									><path
										d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0Z"
									></path></svg
								>
								<div class="browser-address-url">
									{displayUrl}
								</div>
							</div>
						</div>
						<div class="browser-content-area">
							<div class="browser-content-inner">
								{#if imageUrl}
									<img src={imageUrl} alt="webpage banner" />
								{/if}
								<h2>{piece.title}</h2>
								<p>{piece.summary}</p>
							</div>
						</div>
					</div>
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
		border-bottom: 10px solid var(--color-accent);
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
		position: relative;
		overflow: hidden;
		z-index: 2;
	}

	.icon-container {
		width: 550px;
		position: absolute;
		left: -100px;
		top: 50px;
	}

	.right-panel {
		flex: 5;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		padding: 40px 30px 20px 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		color: var(--color-main-text);
	}

	.right-panel h1 {
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

	.right-panel > h2 {
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

	.accent-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: oklch(from var(--color-background, var(--color-surface-container)) 0.22 c h);
		color: #fff;
		padding: 15px 30px;
		text-align: right;
		z-index: 1;
	}

	.byline {
		font-size: 1.3rem;
		margin: 0;
		color: inherit;
	}

	.browser-container {
		width: var(--piece-icon-width);
	}

	.browser-mockup {
		background-color: #e5e7eb;
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		max-height: var(--piece-icon-height);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.browser-window-bar {
		height: calc(30px * var(--piece-icon-scale));
		background-color: #f3f4f6;
		display: flex;
		align-items: center;
		padding: 0 calc(10px * var(--piece-icon-scale));
		border-bottom: 1px solid #d1d5db;
		justify-content: flex-end;
		flex-shrink: 0;
	}

	.browser-controls {
		display: flex;
		gap: calc(5px * var(--piece-icon-scale));
	}

	.browser-control-dot {
		width: calc(0.675rem * var(--piece-icon-scale));
		height: calc(0.675rem * var(--piece-icon-scale));
		border-radius: 9999px;
		border: 1px solid;
	}

	.browser-control-dot.red {
		background-color: #ef4444;
		border-color: #dc2626;
	}

	.browser-control-dot.yellow {
		background-color: #f59e0b;
		border-color: #d97706;
	}

	.browser-control-dot.green {
		background-color: #22c55e;
		border-color: #16a34a;
	}

	.browser-url-bar {
		background-color: #f3f4f6;
		display: flex;
		align-items: center;
		padding: calc(10px * var(--piece-icon-scale));
		border-bottom: 1px solid #d1d5db;
		flex-shrink: 0;
	}

	.browser-address-input {
		flex-grow: 1;
		background-color: #ffffff;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		padding: 0 calc(5px * var(--piece-icon-scale));
		height: calc(30px * var(--piece-icon-scale));
		border-top: 1px solid #d1d5db;
		border-bottom: 1px solid #d1d5db;
		overflow: hidden;
	}

	.browser-address-input svg {
		width: calc(18px * var(--piece-icon-scale));
		height: calc(18px * var(--piece-icon-scale));
		color: #22c55e;
		margin-right: calc(5px * var(--piece-icon-scale));
		flex-shrink: 0;
	}

	.browser-address-url {
		color: #6b7280;
		font-size: calc(0.75rem * var(--piece-icon-scale));
		line-height: calc(1.25rem * var(--piece-icon-scale));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.browser-content-area {
		background-color: #ffffff;
		overflow: hidden;
		position: relative;
	}

	.browser-content-inner {
		margin: auto;
	}

	.browser-content-inner img {
		width: 100%;
		height: calc(var(--piece-icon-width) / 3);
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f0f0f0;
		object-fit: cover;
		object-position: top center;
	}

	.browser-content-inner h2 {
		font-size: calc(1.25rem * var(--piece-icon-scale));
		font-weight: 700;
		color: #111827;
		margin: calc(10px * var(--piece-icon-scale)) calc(14px * var(--piece-icon-scale));
		text-align: center;
	}

	.browser-content-inner p {
		color: #4b5563;
		line-height: calc(1.35rem * var(--piece-icon-scale));
		margin: calc(10px * var(--piece-icon-scale)) calc(14px * var(--piece-icon-scale));
		text-align: left;
		font-size: calc(0.75rem * var(--piece-icon-scale));
	}
</style>
