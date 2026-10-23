<script lang="ts">
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = {
		piece: PublicWebPiece
		fields: Fields
		size: { width: number; height?: number }
		helpers: PieceComponentHelpers
		lazy?: boolean
		active?: boolean
	}
	let { size, piece, fields, helpers, active = false }: Props = $props()
	const scale = $derived(Math.round((size.width / 375) * 100) / 100)
	const files = $derived(fields.files ?? [])
	const firstSnippet = $derived(files.find((file) => (file.type ?? 'snippet') === 'snippet'))
	const content = $derived(
		firstSnippet ? helpers.getPieceAssetContent(firstSnippet.file, 'highlight') : undefined
	)
</script>

<section
	data-theme="dark"
	class="terminal-container"
	class:active
	inert
	style="
	  --piece-icon-scale: {scale};
	  --piece-icon-width: {size.width}px;
		--piece-icon-height: {size.height ?? (size.width * 3) / 2}px;"
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
</section>

<style>
	.active {
		outline: 1px solid var(--color-primary);
		border-radius: calc(0.75rem * var(--piece-icon-scale));
	}

	.terminal-container {
		width: var(--piece-icon-width);
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

	.active .terminal-mockup {
		border: 1px solid var(--color-primary);
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

	.active .terminal-window-bar {
		background-color: var(--color-primary);
	}

	.active .terminal-filename {
		color: var(--color-on-primary);
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
	}

	.terminal-content :global(pre) {
		margin: 0;
		display: inline-block;
		width: 100%;
	}

	.terminal-content p {
		margin: 0;
	}
</style>
