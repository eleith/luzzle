<script lang="ts">
	import { type PieceOpengraphProps } from '$lib/pieces/helpers'
	import Icon from '$lib/pieces/components/icon.svelte'

	let { piece, metadata, helpers }: PieceOpengraphProps = $props()
	const palette = $derived(helpers.getPiecePalette())
</script>

<section
	class="container"
	style="
		--color-main-text: {palette?.bodyText};
		--color-title-text: {palette?.titleText};
		--color-background: {palette?.background};
		--color-accent: {palette?.accent};"
>
	<div class="left-panel">
		<Icon {piece} size={{ width: 350 }} lazy={false} />
	</div>

	<div class="right-panel">
		<h1 style="--font-size:{piece.title.length < 12 ? 5 : 3.5}rem">
			{piece.title}
		</h1>
		<h2 style="--font-size:2.5rem">
			{metadata.author as string}
		</h2>
	</div>
</section>

<style>
	section.container {
		display: flex;
		width: 100%;
		height: 100%;
		background: var(--color-background);
		border-bottom: 10px solid var(--color-accent);
	}

	.left-panel {
		flex: 4;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.right-panel {
		flex: 5;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		padding: 20px;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		padding-left: 0px;
		color: var(--color-main-text);
	}

	.right-panel h1 {
		font-size: var(--font-size);
		font-weight: 900;
		margin: 0;
		max-height: 45%;
		overflow: hidden;
		text-overflow: ellipsis;
		line-clamp: 3;
		-webkit-line-clamp: 3;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		color: var(--color-title-text);
	}

	.right-panel h2 {
		font-size: var(--font-size);
		font-weight: 400;
		margin: 10px 0 0;
		max-height: 40%;
		overflow: hidden;
		text-overflow: ellipsis;
		line-clamp: 3;
		-webkit-line-clamp: 3;
		display: -webkit-box;
		-webkit-box-orient: vertical;
	}
</style>
