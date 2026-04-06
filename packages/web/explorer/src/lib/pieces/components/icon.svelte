<script lang="ts">
	import type { Component } from 'svelte'
	import type { PublicWebPiece } from '$lib/pieces/types'
	import IconDefault from '$lib/pieces/components/icon.default.svelte'
	import { getPieceHelpers, type PieceIconProps, type PieceMode } from '$lib/pieces/helpers.js'
	import { getContext } from 'svelte'

	const iconComponentMap = new Map<string, Component<PieceIconProps>>()
	const iconComponents: Record<string, { default: Component<PieceIconProps> }> = import.meta.glob(
		'$lib/pieces/components/custom/*/icon.svelte',
		{ eager: true }
	)

	for (const path in iconComponents) {
		const type = path.split('/').at(-2)
		if (type) {
			iconComponentMap.set(type, iconComponents[path].default)
		}
	}

	type Props = {
		active?: boolean
		lazy?: boolean
		piece: PublicWebPiece
		size: { width: number; height?: number }
	}

	let { piece, lazy = false, size }: Props = $props()

	const tags = $derived(JSON.parse(piece.keywords || '[]')) as string[]
	const width = $derived(size.width)
	const height = $derived(size.height ? size.height : (width * 3) / 2)
	const mode = getContext<PieceMode>('piece-mode')
	const helpers = getPieceHelpers(piece, mode)
	const IconComponent = $derived(iconComponentMap.get(piece.type) || IconDefault)
</script>

<IconComponent {piece} {tags} size={{ width, height }} {lazy} {helpers} />
