<script lang="ts">
	import { type PieceOpengraphProps } from '$lib/pieces/helpers'
	import Icon from '$lib/pieces/components/icon.svelte'

	let { piece, helpers }: PieceOpengraphProps = $props()
	const metadata = piece.metadata

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
	<div class="icon-container">
		<Icon {piece} size={{ width: 800 }} lazy={false} {helpers} />
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

	.icon-container {
		flex-shrink: 0;
	}

	.accent-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
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
</style>
