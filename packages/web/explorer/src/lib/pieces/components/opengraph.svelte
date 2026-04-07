<script lang="ts">
	import { getContext, type Component } from 'svelte'
	import { OpengraphImageHeight, OpengraphImageWidth } from '@luzzle/web.utils'
	import type { PublicWebPiece } from '$lib/pieces/types'
	import OpengraphDefault from '$lib/pieces/components/opengraph.default.svelte'
	import { getPieceHelpers, type PieceMode, type PieceOpengraphProps } from '../helpers'

	const opengraphImports = import.meta.glob<{ default: Component<PieceOpengraphProps> }>(
		'$lib/pieces/components/custom/*/opengraph.svelte'
	)

	const opengraphImportMap = new Map<
		string,
		() => Promise<{ default: Component<PieceOpengraphProps> }>
	>()
	for (const customPath in opengraphImports) {
		const type = customPath.split('/').at(-2)
		if (type) {
			opengraphImportMap.set(type, opengraphImports[customPath])
		}
	}

	type Props = {
		piece: PublicWebPiece
	}

	let { piece }: Props = $props()

	const tags = $derived(JSON.parse(piece.keywords || '[]')) as string[]

	async function resolveOpengraph(type: string): Promise<Component<PieceOpengraphProps>> {
		const importer = opengraphImportMap.get(type)
		if (!importer) return OpengraphDefault
		try {
			const mod = await importer()
			return mod.default
		} catch {
			return OpengraphDefault
		}
	}

	const Opengraph = $derived(await resolveOpengraph(piece.type))
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
