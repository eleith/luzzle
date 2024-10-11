<script lang="ts">
	import { type WebPieces } from '$lib/pieces/types'
	import Picture from '../picture.svelte'

	type Props = {
		piece: WebPieces
		active?: boolean
		size?: 'small' | 'medium' | 'large'
		lazy?: boolean
	}

	let { piece, active, size = 'small', lazy }: Props = $props()
	let width = size === 'small' ? 120 : size === 'medium' ? 200 : size === 'large' ? 300 : 400
</script>

<div class="poster" class:posterActive={active} style:--piece-icon-width="{width}px">
	<div style="width: var(--piece-icon-width, 400px);">
		{#if piece.media}
			<Picture {piece} {size} {lazy} decoding="async" alt="" />
		{:else}
			<div>{piece.title}</div>
		{/if}
	</div>
</div>

<style>
	.posterActive {
		--piece-icon-color: var(--colors-primary);
	}

	.poster {
		width: var(--piece-icon-width, 400px);
		height: calc(var(--piece-icon-width, 400px) * 3 / 2);
		box-shadow: -8px 8px 8px var(--colors-shadow);
		border-radius: var(--piece-icon-border-radius, 5px);
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: var(--piece-icon-color, white);
	}

	.poster > :global(picture > img) {
		height: calc(var(--piece-icon-width, 400px) * 3 / 2 * 0.92);
		width: calc(var(--piece-icon-width, 400px) * 0.92);
		object-fit: cover;
		object-position: top;
	}
</style>
