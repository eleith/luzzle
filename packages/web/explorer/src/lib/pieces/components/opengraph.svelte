<script lang="ts">
	import { page } from '$app/state'
	import type { Component } from 'svelte'
	import {
		type IconProps,
		type OpengrapHelpers,
		type OpengraphProps,
		type WebPieces
	} from '@luzzle/tools/types'
	import {
		getImageAssetPath,
		OpengraphImageHeight,
		OpengraphImageWidth
	} from '@luzzle/tools/browser'
	import OpengraphDefault from '$lib/pieces/components/opengraph.default.svelte'

	const customOpengraphMap = new Map<string, { default: Component<OpengraphProps> }>()
	const customIconMap = new Map<string, { default: Component<IconProps> }>()
	const customComponents: Record<string, { default: Component }> = import.meta.glob(
		'$lib/pieces/components/custom/*/*.svelte',
		{ eager: true }
	)

	for (const customPath in customComponents) {
		const parts = customPath.split('/')
		const type = parts.at(-2)

		if (type) {
			const componentType = parts.at(-1)

			if (componentType === 'opengraph.svelte') {
				customOpengraphMap.set(type, customComponents[customPath])
			} else if (componentType === 'icon.svelte') {
				customIconMap.set(type, customComponents[customPath])
			}
		}
	}

	type Props = {
		piece: WebPieces
		palette?: OpengraphProps['palette']
	}

	let { piece, palette }: Props = $props()

	const frontmatter = JSON.parse(piece.json_metadata || '{}') || {}
	const tags = JSON.parse(piece.keywords || '[]') || []
	const helpers: OpengrapHelpers = {
		getPieceUrl: function () {
			return `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`
		},
		getPieceImageUrl: function (asset: string, width: number, format: 'jpg' | 'avif') {
			const path = getImageAssetPath(piece.type, piece.id, asset, width, format)
			return `${page.data.config.url.luzzle_assets}/pieces/assets/${path}`
		}
	}

	const Opengraph = customOpengraphMap.get(piece.type)?.default
	const Icon = customIconMap.get(piece.type)?.default
	const OpengraphComponent = Opengraph || OpengraphDefault
</script>

<section style="width:{OpengraphImageWidth}px;height:{OpengraphImageHeight}px;">
	<OpengraphComponent
		{Icon}
		piece={{ ...piece, frontmatter, tags }}
		size={{ width: OpengraphImageWidth, height: OpengraphImageHeight }}
		{helpers}
		{palette}
	/>
</section>
