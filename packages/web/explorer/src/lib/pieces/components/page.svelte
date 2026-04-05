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
	const pageImport = $derived(pageImportMap.get(piece.type))
</script>

{#if pageImport}
	{#await pageImport() then { default: Page }}
		<Page {piece} {tags} {helpers} />
	{:catch}
		<PageDefault {piece} {tags} {helpers} />
	{/await}
{:else}
	<PageDefault {piece} {tags} {helpers} />
{/if}
