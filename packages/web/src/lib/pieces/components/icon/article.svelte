<script lang="ts">
	import { type WebPieces } from '$lib/pieces/types'
	import Picture from '../picture.svelte'

	type Props = {
		piece: WebPieces
		active?: boolean
		size?: 'small' | 'medium' | 'large'
		lazy?: boolean
	}

	let { piece, active, size = 'small', lazy = true }: Props = $props()
	let width = size === 'small' ? 120 : size === 'medium' ? 200 : size === 'large' ? 300 : 400
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
			{#each Array.from({ length: 20 }) as _}
				<div class="articleBlock"></div>
			{/each}
		</div>
	</div>
	<div class="articleShadow"></div>
</div>

<style>
	.articlePage {
		container: article / inline-size;
		width: var(--piece-icon-width, 400px);
	}

	.articlePageActive {
		--piece-icon-color: var(--colors-primary);
	}

	.articleShadow {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--piece-icon-width, 400px);
		height: calc(var(--piece-icon-width, 400px) * 1.5);
		border-top-right-radius: var(--piece-icon-border-radius, 7px);
		border-bottom-right-radius: var(--piece-icon-border-radius, 7px);
		box-shadow: -11px 11px 15px black;
	}

	:global(html[data-theme='light']) .articleShadow {
		box-shadow: -11px 11px 15px rgba(0, 0, 0, 0.35);
	}

	:global(html[data-theme='dark']) .articleShadow {
		box-shadow: -11px 11px 15px black;
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

	/*
	.articleImageBackground {
		position: absolute;
		top: 0px;
		left: 0px;
		right: 0px;
		bottom: 0px;
		filter: blur(2px);
		opacity: 0.3;
		transform: scale(1.1);
	}
  */

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
		overflow: hidden;
		background-color: var(--piece-icon-color, white);
		color: var(--piece-icon-text-color, black);
		border-radius: var(--piece-icon-border-radius, 7px);
		font-size: var(--piece-icon-font-size, 10px);
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
