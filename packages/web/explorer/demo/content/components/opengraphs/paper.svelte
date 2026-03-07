<script lang="ts">
	import { type PieceOpengraphProps } from '$lib/pieces/helpers'
	import Icon from '$lib/pieces/components/icon.svelte'

	const { helpers, piece }: PieceOpengraphProps = $props()
	const title = piece.title
	const minutes = Math.floor(((piece.note?.length || 0) as number) / 5 / 250)
	const titleSize = piece.title.length < 20 ? 120 : 66
	const palette = $derived(helpers.getPiecePalette())
</script>

<section
	class="container"
	style="
			width: 100%;
			height: 100%;
			--color-main: {palette?.background || '#43488f'};
			--color-accent: {palette?.accent || '#f1d53f'};
			--color-main-text: {palette?.bodyText || '#f5f5f5'};
			--color-title-text: {palette?.titleText || '#f5f5f5'};"
>
	<div class="opengraph">
		<div class="left-panel">
			<div class="icon-container">
				<Icon {piece} size={{ width: 400 }} lazy={false} />
			</div>
		</div>
		<div class="right-panel">
			<h1 style="--font-size:{titleSize}px">
				{title}
			</h1>
			<h2 style="--font-size:44px">
				{minutes} min read
			</h2>
		</div>
	</div>
</section>

<style>
	section.container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		background-color: var(--color-main);
		border-bottom: var(--color-accent) solid 10px;
	}

	.opengraph {
		display: flex;
		width: 100%;
		height: 100%;
		flex-direction: row-reverse;
	}

	.left-panel {
		flex: 4;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}

	.icon-container {
		width: 100%;
		position: absolute;
		left: 32px;
		top: 120px;
	}

	.right-panel {
		flex: 7;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-end;
		text-align: right;
		padding: 20px;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		color: var(--color-main-text);
	}

	.right-panel h1 {
		font-size: var(--font-size);
		font-weight: 900;
		margin: 0;
		max-height: 55%;
		overflow: hidden;
		text-overflow: ellipsis;
		line-clamp: 4;
		-webkit-line-clamp: 4;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		color: var(--color-body-text);
	}

	.right-panel h2 {
		font-size: var(--font-size);
		font-weight: 400;
		margin: 10px 0 0;
		max-height: 25%;
		overflow: hidden;
		text-overflow: ellipsis;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		display: -webkit-box;
		-webkit-box-orient: vertical;
	}
</style>
