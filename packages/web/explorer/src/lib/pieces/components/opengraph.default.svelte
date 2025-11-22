<script lang="ts">
	import { type PieceOpengraphProps } from '@luzzle/web.utils'
	import Icon from '$lib/pieces/components/icon.svelte'

	const { palette, piece }: PieceOpengraphProps = $props()
</script>

<section
	class="container"
	style="
			width: 100%;
			height: 100%;
			--color-main: {palette?.background || 'white'};
			--color-accent: {palette?.accent || '#000'};
			--color-main-text: {palette?.bodyText || '#000'};
			--color-title-text: {palette?.titleText || '#000'};"
>
	<div class="opengraph">
		<div class="left-panel">
			<Icon {piece} size={{ width: 350 }} />
		</div>
		<div class="right-panel">
			<h1 style="--font-size:{piece.title.length < 25 ? 5 : 3}rem">
				{piece.title}
			</h1>
			<p style="--font-size:1.5rem">
				{piece.summary}
			</p>
		</div>
	</div>
</section>

<style>
	@font-face {
		font-family: 'Noto Sans', sans-serif;
		src: url(/fonts/noto-sans.woff2) format('woff2');
		font-weight: 100 900;
		font-style: normal;
		font-variation-settings: 'wdth' 100;
		font-optical-sizing: auto;
	}

	section.container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		font-family: 'Noto Sans', sans-serif;
		background-color: var(--color-main);
		border-bottom: var(--color-accent) solid 10px;
	}

	.opengraph {
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
		background-color: var(--color-accent);
	}

	.right-panel {
		flex: 5;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		padding: 20px;
		padding-left: 0px;
		color: var(--color-main-text);
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}

	.right-panel h1 {
		font-size: var(--font-size);
		font-weight: 900;
		margin: 0;
		max-height: 35%;
		overflow: hidden;
		text-overflow: ellipsis;
		line-clamp: 3;
		-webkit-line-clamp: 3;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		color: var(--color-title-text);
	}

	.right-panel p {
		font-size: var(--font-size);
		margin: 10px 0 0;
		font-weight: 100;
		max-height: 40%;
		overflow: hidden;
		text-overflow: ellipsis;
		line-clamp: 5;
		-webkit-line-clamp: 5;
		display: -webkit-box;
		-webkit-box-orient: vertical;
	}
</style>
