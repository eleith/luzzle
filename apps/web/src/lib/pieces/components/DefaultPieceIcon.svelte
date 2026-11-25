<script lang="ts">
	import Icon from '@luzzle/web.templates/icons/default'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'

	let {
		piece,
		size,
		lazy = false,
		active = false
	}: {
		piece: TemplatedPiece
		size: { width: number; height?: number }
		lazy?: boolean
		active?: boolean
	} = $props()
	const fields = $derived(piece.templates.icon.fields)
	const helpers = $derived(getPieceHelpers(piece))
</script>

<Icon {piece} {fields} {size} {lazy} {active} {helpers} />
