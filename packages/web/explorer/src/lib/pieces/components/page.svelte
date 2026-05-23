<script lang="ts">
	import { getContext, setContext, type Component } from 'svelte'
	import type { PublicWebPiece } from '@luzzle/web.db'
	import PageDefault from '$lib/pieces/components/page.default.svelte'
	import PieceIcon from '$lib/pieces/components/icon.svelte'
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import { getPieceHelpers, type PieceMode, type PiecePageProps } from '$lib/pieces/helpers.js'

	const components = { NavBanner, PieceIcon }

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
		mode?: PieceMode
	}

	let { piece, tags, mode }: Props = $props()
	const effectiveMode: PieceMode = mode ?? getContext<PieceMode>('piece-mode') ?? 'public'
	setContext('piece-mode', effectiveMode)
	const helpers = getPieceHelpers(piece, effectiveMode)

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

<PageComponent {piece} {tags} {helpers} {components} />
