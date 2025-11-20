<script lang="ts">
	import { page } from '$app/state'
	import type { Component } from 'svelte'
	import {
		type PieceIconProps,
		type WebPieces,
		getImageAssetPath,
		ASSET_SIZES
	} from '@luzzle/web.utils'
	import IconDefault from '$lib/pieces/components/icon.default.svelte'

	const iconComponentMap = new Map<string, { default: Component<PieceIconProps> }>()
	const iconComponents: Record<string, { default: Component }> = import.meta.glob(
		'$lib/pieces/components/custom/*/icon.svelte',
		{ eager: true }
	)

	for (const path in iconComponents) {
		const type = path.split('/').at(-2)
		if (type) {
			iconComponentMap.set(type, iconComponents[path])
		}
	}

	type Props = {
		active?: boolean
		lazy?: boolean
		piece: WebPieces
		size: keyof typeof ASSET_SIZES | { width: number; height?: number }
	}

	let { piece, lazy = false, size }: Props = $props()

	const metadata = $derived(JSON.parse(piece.json_metadata || '{}')) as Record<string, unknown>
	const tags = $derived(JSON.parse(piece.keywords || '[]')) as string[]
	const width = $derived(typeof size === 'string' ? ASSET_SIZES[size] : size.width)
	const height = $derived(typeof size !== 'string' && size.height ? size.height : (width * 3) / 2)
	const helpers = {
		getPieceUrl: function () {
			return `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`
		},
		getPieceImageUrl: function (asset: string, width: number, format: 'jpg' | 'avif') {
			const path = getImageAssetPath(piece.type, piece.id, asset, width, format)
			return `${page.data.config.url.luzzle_assets}/pieces/assets/${path}`
		}
	}
	const IconComponent = $derived(iconComponentMap.get(piece.type)?.default || IconDefault)
</script>

<IconComponent {piece} {metadata} {tags} size={{ width, height }} {lazy} {helpers} />
