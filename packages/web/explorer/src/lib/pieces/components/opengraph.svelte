<script lang="ts">
	import { getContext, type Component } from 'svelte'
	import { OpengraphImageHeight, OpengraphImageWidth } from '@luzzle/web.utils'
	import type { PublicWebPiece } from '$lib/pieces/types'
	import OpengraphDefault from '$lib/pieces/components/opengraph.default.svelte'
	import { getPieceHelpers, type PieceMode, type PieceOpengraphProps } from '../helpers'

	const customOpengraphMap = new Map<string, { default: Component<PieceOpengraphProps> }>()
	const customComponents: Record<string, { default: Component }> = import.meta.glob(
		'$lib/pieces/components/custom/*/opengraph.svelte',
		{ eager: true }
	)

	for (const customPath in customComponents) {
		const parts = customPath.split('/')
		const type = parts.at(-2)

		if (type) {
			customOpengraphMap.set(type, customComponents[customPath])
		}
	}

	type Props = {
		piece: PublicWebPiece
	}

	let { piece }: Props = $props()

	const tags = $derived(JSON.parse(piece.keywords || '[]')) as string[]
	const Opengraph = $derived(customOpengraphMap.get(piece.type)?.default || OpengraphDefault)
	const mode = getContext<PieceMode>('piece-mode')
	const helpers = getPieceHelpers(piece, mode)
</script>

<section style="width:{OpengraphImageWidth}px;height:{OpengraphImageHeight}px;">
	<Opengraph
		{piece}
		{tags}
		size={{ width: OpengraphImageWidth, height: OpengraphImageHeight }}
		{helpers}
	/>
</section>
