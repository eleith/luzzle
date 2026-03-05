<script lang="ts">
	import type { Component } from 'svelte'
	import type { PublicWebPiece } from '$lib/pieces/types'
	import IconDefault from '$lib/pieces/components/icon.default.svelte'
	import { getPieceHelpers, type PieceIconProps, type PieceMode } from '$lib/pieces/helpers.js'
	import { getContext } from 'svelte'
	import type { PieceFrontmatter } from '@luzzle/core'

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
		piece: PublicWebPiece
		metadata: PieceFrontmatter
		size: { width: number; height?: number }
	}

	let { piece, metadata, lazy = false, size }: Props = $props()

	const tags = $derived(JSON.parse(piece.keywords || '[]')) as string[]
	const width = $derived(size.width)
	const height = $derived(size.height ? size.height : (width * 3) / 2)
	const mode = getContext<PieceMode>('piece-mode')
	const helpers = getPieceHelpers(piece, mode)
	const IconComponent = $derived(iconComponentMap.get(piece.type)?.default || IconDefault)
</script>

<IconComponent {piece} {metadata} {tags} size={{ width, height }} {lazy} {helpers} />
