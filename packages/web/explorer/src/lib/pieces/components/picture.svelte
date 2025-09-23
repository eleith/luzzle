<script lang="ts">
	import { page } from '$app/state'
	import type { WebPieces } from '$lib/pieces/types'
	import type { HTMLImgAttributes } from 'svelte/elements'

	type Props = {
		piece: WebPieces
		size?: 'small' | 'medium' | 'large' | 'xlarge'
		lazy?: boolean
	} & HTMLImgAttributes

	let { size = 'small', piece, lazy = true, ...props }: Props = $props()
	let width = size === 'small' ? 120 : size === 'medium' ? 200 : size === 'large' ? 300 : 400
	const match = piece.media?.match(/([^/\\]+)\.[^/.]+$/)

	let media = match ? match[1] : null
</script>

{#if media}
	<picture>
		<source
			srcset="{page.data.config.url.luzzle_assets}/images/pieces/{piece.type}/{piece.slug}/{media}.{size}.avif"
			type="image/avif"
		/>
		<img
			src="{page.data.config.url.luzzle_assets}/images/pieces/{piece.type}/{piece.slug}/{media}.{size}.jpg"
			loading={lazy ? 'lazy' : 'eager'}
			{width}
			height={(3 / 2) * width}
			decoding="async"
			{...props}
		/>
	</picture>
{/if}
