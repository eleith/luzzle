<script lang="ts">
	import PiecePage from '$lib/pieces/components/page.svelte'
	import ArrowLeftIcon from 'virtual:icons/ph/arrow-left'
	import { setContext } from 'svelte'

	let { data } = $props()
	setContext('piece-mode', 'preview')

	const editorUrl = `/editor/piece/${data.file}/source`
</script>

<div class="preview-banner">
	<div class="preview-banner-left">
		<span class="preview-label">preview</span>
		<span class="preview-title">{data.piece.title}</span>
	</div>
	<a href={editorUrl} class="preview-back">
		<ArrowLeftIcon />
		back to editor
	</a>
</div>
<PiecePage piece={data.piece} tags={data.tags} />

<style>
	.preview-banner {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: var(--color-tertiary-container);
		color: var(--color-on-tertiary-container);
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-small);
	}

	.preview-banner-left {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
	}

	.preview-label {
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.preview-title {
		opacity: 0.8;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.preview-back {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-on-tertiary-container);
		text-decoration: none;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.preview-back:hover {
		text-decoration: underline;
	}
</style>
