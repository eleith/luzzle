<script lang="ts">
	import { type PieceOpengraphProps } from '$lib/pieces/helpers'
	import Icon from '$lib/pieces/components/icon.svelte'

	let { piece, helpers }: PieceOpengraphProps = $props()
	const metadata = piece.metadata

	const backdrop = metadata.backdrop
	const backdropImage = backdrop ? helpers.getPieceImageUrl(backdrop, 1200, 'jpg') : null
	const palette = $derived(helpers.getPiecePalette())

	const bylineParts: string[] = []
	if (metadata.date_released)
		bylineParts.push(String(new Date(metadata.date_released).getUTCFullYear()))
	if (metadata.runtime) bylineParts.push(`${metadata.runtime} min`)
	if (piece.date_consumed) {
		bylineParts.push(
			new Date(piece.date_consumed)
				.toLocaleDateString('en-US', { timeZone: 'UTC' })
				.replaceAll('/', '.')
		)
	}
</script>

<section
	class="container"
	class:backdrop={!!backdrop}
	style="
		background-image: url('{backdropImage}');
		--color-main-text: {palette?.bodyText};
		--color-title-text: {palette?.titleText};
		--color-background: {palette?.background};
		--color-accent: {palette?.accent};"
>
	<div class="cover"></div>
	<div class="main">
		<div class="left-panel">
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
			{#if metadata.director}
				<h2>by {metadata.director}</h2>
			{/if}
		</div>
		<div class="right-panel">
			<Icon {piece} size={{ width: 350 }} lazy={false} {helpers} />
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
		width: 100%;
		height: 100%;
		background: var(--color-background);
		border-bottom: 10px solid var(--color-accent);
	}

	section.container.backdrop {
		background-size: cover;
		background-position: center center;
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
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		padding: 40px 0 20px 30px;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		color: var(--color-main-text);
	}

	.left-panel h1 {
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
	}

	.accent-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: oklch(from var(--color-background) calc(l * 0.7) c h);
		padding: 15px 30px;
		text-align: left;
		z-index: 1;
	}

	.byline {
		font-size: 1.3rem;
		margin: 0;
		color: var(--color-main-text);
	}
</style>
