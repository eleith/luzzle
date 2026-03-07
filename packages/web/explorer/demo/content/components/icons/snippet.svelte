<script lang="ts">
	import { type PieceIconProps } from '$lib/pieces/helpers'
	let { size, piece, helpers }: PieceIconProps = $props()
	const scale = Math.round((size.width / 375) * 100) / 100
	const files = piece.metadata?.files ?? []
	const firstSnippet = files.find((f: { type: string }) => f.type === 'snippet')
	const content = firstSnippet
		? helpers.getPieceAssetContent(firstSnippet.file, 'highlight')
		: undefined
</script>

<div
	class="terminal-container"
	style="
	  --piece-icon-scale: {scale};
	  --piece-icon-width: {size.width}px;
		--piece-icon-height: {(size.width * 3) / 2}px;"
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

<style>
	.terminal-container {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
	}

	.terminal-mockup {
		border: 1px solid var(--color-surface-container);
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		height: var(--piece-icon-height);
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
		color: var(--color-on-surface-container);
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
	}

	.terminal-content :global(pre) {
		margin: 0;
	}

	.terminal-content p {
		margin: 0;
	}
</style>
