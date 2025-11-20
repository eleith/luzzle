<script lang="ts">
	import { page } from '$app/state'
	import type { Component } from 'svelte'
	import {
		type PieceComponentHelpers,
		type PieceOpengraphProps,
		type WebPieces,
		getImageAssetPath,
		OpengraphImageHeight,
		OpengraphImageWidth
	} from '@luzzle/web.utils'
	import OpengraphDefault from '$lib/pieces/components/opengraph.default.svelte'

	const customOpengraphMap = new Map<string, { default: Component<PieceOpengraphProps> }>()
	const customComponents: Record<string, { default: Component }> = import.meta.glob(
		'$lib/pieces/components/custom/*/opengraph.svelte',
		{ eager: true }
	)

	for (const customPath in customComponents) {
		const parts = customPath.split('/')
		const type = parts.at(-2)

		if (type) {
			customOpengraphMap.set(type, customComponents[customPath])
		}
	}

	type Props = {
		piece: WebPieces
		palette?: PieceOpengraphProps['palette']
	}

	let { piece, palette }: Props = $props()

	const metadata = $derived(JSON.parse(piece.json_metadata || '{}')) as Record<string, unknown>
	const tags = $derived(JSON.parse(piece.keywords || '[]')) as string[]
	const helpers: PieceComponentHelpers = {
		getPieceUrl: function () {
			return `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`
		},
		getPieceImageUrl: function (asset: string, width: number, format: 'jpg' | 'avif') {
			const path = getImageAssetPath(piece.type, piece.id, asset, width, format)
			return `${page.data.config.url.luzzle_assets}/pieces/assets/${path}`
		}
	}

	const Opengraph = $derived(customOpengraphMap.get(piece.type)?.default || OpengraphDefault)
</script>

<section style="width:{OpengraphImageWidth}px;height:{OpengraphImageHeight}px;">
	<Opengraph
		{piece}
		{metadata}
		{tags}
		size={{ width: OpengraphImageWidth, height: OpengraphImageHeight }}
		{helpers}
		{palette}
	/>
</section>
