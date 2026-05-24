<script lang="ts">
	import type { Component } from 'svelte'
	import type { PublicWebPiece } from '@luzzle/web.db'
	import OpengraphDefault from '$lib/pieces/components/opengraph.default.svelte'
	import {
		getPieceHelpers,
		OpengraphImageHeight,
		OpengraphImageWidth,
		type PieceOpengraphProps
	} from '../helpers'

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
	const helpers = getPieceHelpers(piece)
</script>

{#await resolveOpengraph(piece.type) then Opengraph}
	<section style="width:{OpengraphImageWidth}px;height:{OpengraphImageHeight}px;">
		<Opengraph {piece} {helpers} />
	</section>
{:catch}
	<section style="width:{OpengraphImageWidth}px;height:{OpengraphImageHeight}px;">
		<OpengraphDefault {piece} {helpers} />
	</section>
{/await}
