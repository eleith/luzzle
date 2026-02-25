<script lang="ts">
	import { getContext, type Component } from 'svelte'
	import type { WebPiece } from '$lib/pieces/types'
	import PageDefault from '$lib/pieces/components/page.default.svelte'
	import { getPieceHelpers, type PieceMode, type PiecePageProps } from '$lib/pieces/helpers.js'

	const customPageMap = new Map<string, { default: Component<PiecePageProps> }>()
	const customComponents: Record<string, { default: Component }> = import.meta.glob(
		'$lib/pieces/components/custom/*/page.svelte',
		{ eager: true }
	)

	for (const customPath in customComponents) {
		const parts = customPath.split('/')
		const type = parts.at(-2)

		if (type) {
			customPageMap.set(type, customComponents[customPath])
		}
	}

	type Props = {
		piece: WebPiece
		metadata: Record<string, unknown>
		tags: Array<{ slug: string; tag: string }>
		html_note: string | null
	}

	let { piece, metadata, tags, html_note }: Props = $props()
	const Page = $derived(customPageMap.get(piece.type)?.default || PageDefault)
	const mode = getContext<PieceMode>('piece-mode')
	const helpers = getPieceHelpers(piece, mode)
</script>

<Page {piece} {metadata} {tags} {html_note} {helpers} />
