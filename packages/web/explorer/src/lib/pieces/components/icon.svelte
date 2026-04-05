<script lang="ts">
	import type { Component } from 'svelte'
	import type { PublicWebPiece } from '$lib/pieces/types'
	import IconDefault from '$lib/pieces/components/icon.default.svelte'
	import { getPieceHelpers, type PieceIconProps, type PieceMode } from '$lib/pieces/helpers.js'
	import { getContext } from 'svelte'

	const iconImports = import.meta.glob<{ default: Component<PieceIconProps> }>(
		'$lib/pieces/components/custom/*/icon.svelte'
	)

	const iconImportMap = new Map<string, () => Promise<{ default: Component<PieceIconProps> }>>()
	for (const path in iconImports) {
		const type = path.split('/').at(-2)
		if (type) {
			iconImportMap.set(type, iconImports[path])
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
	const iconImport = $derived(iconImportMap.get(piece.type))
</script>

{#if iconImport}
	{#await iconImport() then { default: IconComponent }}
		<IconComponent {piece} {tags} size={{ width, height }} {lazy} {helpers} />
	{:catch}
		<IconDefault {piece} {tags} size={{ width, height }} {lazy} {helpers} />
	{/await}
{:else}
	<IconDefault {piece} {tags} size={{ width, height }} {lazy} {helpers} />
{/if}
