<script lang="ts">
	import { page } from '$app/state'
	import type { WebPieces } from '$lib/pieces/types'
	import { getAssetPath, ASSET_SIZES } from '@luzzle/tools/browser'
	import type { HTMLImgAttributes } from 'svelte/elements'

	type SIZE = keyof typeof ASSET_SIZES
	type Props = {
		piece: WebPieces
		size?: SIZE
		lazy?: boolean
	} & HTMLImgAttributes

	let { size = 's', piece, lazy = true, ...props }: Props = $props()
	let width = size === 's' ? 120 : size === 'm' ? 200 : size === 'l' ? 300 : 400

	function getMediaPath(media: string, format: 'avif' | 'jpg', size: SIZE) {
		const dir = page.data.config.url.luzzle_assets
		return `${dir}/pieces/assets/${getAssetPath(piece.type, piece.id, media, { format, size })}`
	}
</script>

{#if piece.media}
	<picture>
		<source srcset={getMediaPath(piece.media, 'avif', size)} type="image/avif" />
		<img
			src={getMediaPath(piece.media, 'jpg', size)}
			loading={lazy ? 'lazy' : 'eager'}
			{width}
			height={(3 / 2) * width}
			decoding="async"
			{...props}
		/>
	</picture>
{/if}
