<script lang="ts">
	import { getOpengraph } from '@luzzle/web.templates/opengraphs'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import { getPieceHelpers, OpengraphImageHeight, OpengraphImageWidth } from '../helpers'

	let { piece }: { piece: TemplatedPiece } = $props()
	const Opengraph = $derived(getOpengraph(piece.templates?.opengraph.name))
	const fields = $derived(piece.templates?.opengraph.fields ?? {})
	const helpers = $derived(getPieceHelpers(piece))
</script>

<section style="width:{OpengraphImageWidth}px;height:{OpengraphImageHeight}px;">
	<Opengraph {piece} {fields} {helpers} />
</section>
