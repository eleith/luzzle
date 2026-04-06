<script lang="ts">
	import { getContext, type Component } from 'svelte'
	import type { PublicWebPiece } from '$lib/pieces/types'
	import PageDefault from '$lib/pieces/components/page.default.svelte'
	import { getPieceHelpers, type PieceMode, type PiecePageProps } from '$lib/pieces/helpers.js'

	const pageComponentMap = new Map<string, Component<PiecePageProps>>()
	const pageComponents: Record<string, { default: Component<PiecePageProps> }> = import.meta.glob(
		'$lib/pieces/components/custom/*/page.svelte',
		{ eager: true }
	)

	for (const customPath in pageComponents) {
		const type = customPath.split('/').at(-2)
		if (type) {
			pageComponentMap.set(type, pageComponents[customPath].default)
		}
	}

	type Props = {
		piece: PublicWebPiece
		tags: Array<{ slug: string; tag: string }>
	}

	let { piece, tags }: Props = $props()
	const mode = getContext<PieceMode>('piece-mode')
	const helpers = getPieceHelpers(piece, mode)
	const PageComponent = $derived(pageComponentMap.get(piece.type) || PageDefault)
</script>

<PageComponent {piece} {tags} {helpers} />
