<script lang="ts">
	let { piece, helpers }: PieceOpengraphProps = $props()
	const metadata = piece.metadata

	const iconWidth = 800
	const iconHeight = (iconWidth * 3) / 2
	const iconScale = Math.round((iconWidth / 375) * 100) / 100
	const files = metadata?.files ?? []
	const firstSnippet = files.find((f: { type: string }) => f.type === 'snippet')
	const content = firstSnippet
		? helpers.getPieceAssetContent(firstSnippet.file, 'highlight')
		: undefined

	const bylineParts: string[] = []
	if (metadata.files?.length) {
		const formats = [
			...new Set(metadata.files.map((f: { format: string }) => f.format).filter(Boolean))
		]
		if (formats.length) bylineParts.push(formats.join(', '))
		bylineParts.push(metadata.files.length > 1 ? `${metadata.files.length} files` : '1 file')
	}
	if (piece.date_consumed) {
		bylineParts.push(
			new Date(piece.date_consumed)
				.toLocaleDateString('en-US', { timeZone: 'UTC' })
				.replaceAll('/', '.')
		)
	}
</script>

<section class="container" data-theme="dark">
	<h1
		style="--title-size: {piece.title.length < 10
			? 5
			: piece.title.length < 20
				? 4
				: piece.title.length < 40
					? 3.2
					: 2.5}rem"
	>
		{piece.title}
	</h1>

	<div
		class="terminal-container"
		inert
		style="
			--piece-icon-scale: {iconScale};
			--piece-icon-width: {iconWidth}px;
			--piece-icon-height: {iconHeight}px;"
	>
		<div class="terminal-mockup">
			<div class="terminal-window-bar">
				<div class="terminal-controls">
					<div class="terminal-control-dot red"></div>
					<div class="terminal-control-dot yellow"></div>
					<div class="terminal-control-dot green"></div>
				</div>
				<div class="terminal-filename">
					{piece.title}
				</div>
			</div>
			<div class="terminal-content">
				{#if content}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html content}
				{:else if piece.summary}
					<p>{piece.summary}</p>
				{/if}
			</div>
		</div>
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
		flex-direction: column;
		align-items: center;
		width: 100%;
		height: 100%;
		background: var(--color-on-tertiary-container);
		overflow: hidden;
		padding-top: 30px;
		gap: 30px;
		border-bottom: solid var(--color-secondary) 10px;
	}

	h1 {
		font-size: var(--title-size);
		font-weight: 700;
		margin: 0;
		color: var(--color-on-surface);
		text-align: center;
		padding: 0 60px;
		max-width: 90%;
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
		width: 100%;
		background: oklch(from var(--color-surface-container) l c h / 0.96);
		padding: 15px 30px;
		text-align: right;
		z-index: 1;
	}

	.byline {
		font-size: 1.3rem;
		margin: 0;
		color: var(--color-on-surface-variant);
	}

	.terminal-container {
		width: var(--piece-icon-width);
		flex-shrink: 0;
	}

	.terminal-mockup {
		border: 1px solid var(--color-surface-container);
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		max-height: var(--piece-icon-height);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.terminal-window-bar {
		height: calc(30px * var(--piece-icon-scale));
		background-color: var(--color-surface-container);
		display: flex;
		align-items: center;
		padding: 0 calc(10px * var(--piece-icon-scale));
		position: relative;
		flex-shrink: 0;
	}

	.terminal-controls {
		display: flex;
		gap: calc(5px * var(--piece-icon-scale));
		position: absolute;
		left: calc(10px * var(--piece-icon-scale));
	}

	.terminal-control-dot {
		width: calc(0.675rem * var(--piece-icon-scale));
		height: calc(0.675rem * var(--piece-icon-scale));
		border-radius: 9999px;
	}

	.terminal-control-dot.red {
		background-color: #ff5f56;
	}
	.terminal-control-dot.yellow {
		background-color: #ffbd2e;
	}
	.terminal-control-dot.green {
		background-color: #27c93f;
	}

	.terminal-filename {
		flex-grow: 1;
		text-align: center;
		color: var(--color-on-surface);
		font-size: calc(0.75rem * var(--piece-icon-scale));
		font-family: var(--font-mono-name);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0 calc(60px * var(--piece-icon-scale));
	}

	.terminal-content {
		flex-grow: 1;
		overflow: hidden;
		font-family: var(--font-mono-name);
		font-size: calc(0.55rem * var(--piece-icon-scale));
		line-height: 1.4;
		background-color: var(--color-surface-container-lowest);
	}

	.terminal-content :global(pre) {
		margin: 0;
		display: block;
		width: 100%;
	}

	.terminal-content p {
		margin: 0;
	}
</style>
