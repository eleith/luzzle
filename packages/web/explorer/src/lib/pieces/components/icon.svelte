<script lang="ts">
	import { page } from '$app/state'
	import type { Component } from 'svelte'
	import { type IconProps, type WebPieces } from '@luzzle/tools/types'
	import { getImageAssetPath, ASSET_SIZES } from '@luzzle/tools/browser'
	import IconDefault from '$lib/pieces/components/icon.default.svelte'

	const iconComponentMap = new Map<string, { default: Component<IconProps> }>()
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
		size: keyof typeof ASSET_SIZES
	}

	let { piece, lazy = false, size }: Props = $props()

	const frontmatter = $derived(JSON.parse(piece.json_metadata || '{}'))
	const tags = $derived(JSON.parse(piece.keywords || '[]'))
	const width = $derived(ASSET_SIZES[size])
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

<IconComponent
	piece={{ ...piece, frontmatter, tags }}
	size={{ width, height: (width * 3) / 2 }}
	{lazy}
	{helpers}
/>
