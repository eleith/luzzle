<script lang="ts">
	import type { Component } from 'svelte'
	import type { PublicWebPiece } from '@luzzle/web.db'
	import IconDefault from '$lib/pieces/components/icon.default.svelte'
	import { getPieceHelpers, type PieceIconProps } from '$lib/pieces/helpers.js'

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

	let { piece, lazy = false, size, active = false }: Props = $props()

	const tags = $derived(JSON.parse(piece.keywords || '[]')) as string[]
	const width = $derived(size.width)
	const height = $derived(size.height ? size.height : (width * 3) / 2)
	const helpers = getPieceHelpers(piece)

	async function resolveIcon(type: string): Promise<Component<PieceIconProps>> {
		const importer = iconImportMap.get(type)
		if (!importer) return IconDefault
		try {
			const mod = await importer()
			return mod.default
		} catch {
			return IconDefault
		}
	}
</script>

{#await resolveIcon(piece.type) then IconComponent}
	<IconComponent {piece} {tags} size={{ width, height }} {lazy} {active} {helpers} />
{:catch}
	<IconDefault {piece} {tags} size={{ width, height }} {lazy} {active} {helpers} />
{/await}
