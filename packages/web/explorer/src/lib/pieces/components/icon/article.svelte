<script lang="ts">
	import { type WebPieces } from '$lib/pieces/types'
	import Picture from '../picture.svelte'

	type Props = {
		piece: WebPieces
		active?: boolean
		size?: 's' | 'm' | 'l' | 'xl'
		lazy?: boolean
	}

	let { piece, active, size = 's', lazy }: Props = $props()
	let width = size === 's' ? 120 : size === 'm' ? 200 : size === 'l' ? 300 : 400
</script>

<div class="articlePage" class:articlePageActive={active} style:--piece-icon-width="{width}px">
	<div class="articleContainer">
		<div class="articleTitle">{piece.title}</div>
		{#if piece.media}
			<div class="articleImage">
				<!--
				<picture class="articleImageBackground">
					<img src="/luzzle/{piece.type}/{piece.media}" alt="" width="100%" />
				</picture>
        -->
				<Picture {piece} {size} {lazy} decoding="async" alt="" />
			</div>
		{:else}
			<div class="articleHeader"></div>
		{/if}
		<div class="articleBlockContainer">
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
			{#each Array.from({ length: 20 })}
				<div class="articleBlock"></div>
			{/each}
		</div>
	</div>
</div>

<style>
	.articlePage {
		container: article / inline-size;
		width: var(--piece-icon-width, 400px);
	}

	.articlePageActive {
		--piece-icon-color: var(--colors-primary);
	}

	.articleImage {
		position: relative;
		display: flex;
		justify-content: center;
		overflow: hidden;
		background: var(--piece-icon-image-background-color, black);
	}

	.articleImage :global(img) {
		object-fit: cover;
		object-position: top;
	}

	.articleTitle {
		padding: 10px;
		text-align: center;
	}

	@container article (width < 150px) {
		.articleTitle {
			display: none;
		}
	}

	.articleImage > :global(picture > img) {
		position: relative;
		height: calc(var(--piece-icon-width, 400px) * 1.5 / 4);
	}

	.articleHeader {
		background: var(--piece-icon-text-color, black);
		opacity: 0.5;
		height: 20px;
	}

	.articleBlockContainer {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		padding: 10px;
		overflow: hidden;
	}

	.articleContainer {
		height: calc(var(--piece-icon-width, 400px) * 1.5);
		width: var(--piece-icon-width, 400px);
		overflow: hidden;
		background-color: var(--piece-icon-color, white);
		color: var(--piece-icon-text-color, black);
		border-radius: var(--piece-icon-border-radius, 7px);
		font-size: var(--piece-icon-font-size, 10px);
		box-shadow: -8px 8px 8px var(--colors-shadow);
	}

	.articleBlock {
		height: 1px;
		border: 1px var(--piece-icon-text-color, black) solid;
		border-radius: 3px;
		margin-bottom: 10px;
		width: 100%;
	}

	.articleBlock:nth-child(6n + 6) {
		margin-bottom: 20px;
		width: 50%;
	}
</style>
