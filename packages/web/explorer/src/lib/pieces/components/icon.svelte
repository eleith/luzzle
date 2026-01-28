<script lang="ts">
	import type { Component } from 'svelte'
	import { type WebPieces, ASSET_SIZES } from '@luzzle/web.utils'
	import IconDefault from '$lib/pieces/components/icon.default.svelte'
	import { getPieceHelpers, type PieceIconProps, type PieceMode } from '$lib/pieces/helpers.js'
	import { getContext } from 'svelte'

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
	const mode = getContext<PieceMode>('piece-mode')
	const helpers = getPieceHelpers(piece, mode)
	const IconComponent = $derived(iconComponentMap.get(piece.type)?.default || IconDefault)
</script>

<IconComponent {piece} {metadata} {tags} size={{ width, height }} {lazy} {helpers} />
