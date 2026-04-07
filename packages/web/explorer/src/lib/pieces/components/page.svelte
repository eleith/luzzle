<script lang="ts">
	import { getContext, type Component } from 'svelte'
	import type { PublicWebPiece } from '$lib/pieces/types'
	import PageDefault from '$lib/pieces/components/page.default.svelte'
	import { getPieceHelpers, type PieceMode, type PiecePageProps } from '$lib/pieces/helpers.js'

	const pageImports = import.meta.glob<{ default: Component<PiecePageProps> }>(
		'$lib/pieces/components/custom/*/page.svelte'
	)

	const pageImportMap = new Map<string, () => Promise<{ default: Component<PiecePageProps> }>>()
	for (const customPath in pageImports) {
		const type = customPath.split('/').at(-2)
		if (type) {
			pageImportMap.set(type, pageImports[customPath])
		}
	}

	type Props = {
		piece: PublicWebPiece
		tags: Array<{ slug: string; tag: string }>
	}

	let { piece, tags }: Props = $props()
	const mode = getContext<PieceMode>('piece-mode')
	const helpers = getPieceHelpers(piece, mode)

	async function resolvePage(type: string): Promise<Component<PiecePageProps>> {
		const importer = pageImportMap.get(type)
		if (!importer) return PageDefault
		try {
			const mod = await importer()
			return mod.default
		} catch {
			return PageDefault
		}
	}

	const PageComponent = $derived(await resolvePage(piece.type))
</script>

<PageComponent {piece} {tags} {helpers} />
