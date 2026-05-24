<script lang="ts">
	import type { Component } from 'svelte'
	import type { PublicWebPiece } from '@luzzle/web.db'
	import PageDefault from '$lib/pieces/components/page.default.svelte'
	import PieceIcon from '$lib/pieces/components/icon.svelte'
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import { getPieceHelpers, type PiecePageProps } from '$lib/pieces/helpers.js'

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
	}

	let { piece, tags }: Props = $props()
	const helpers = getPieceHelpers(piece)

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
</script>

{#await resolvePage(piece.type) then PageComponent}
	<PageComponent {piece} {tags} {helpers} {components} />
{:catch}
	<PageDefault {piece} {tags} {helpers} {components} />
{/await}
