<script lang="ts">
	import { getIcon } from '@luzzle/web.templates/icons'
	import type { PublicWebPiece } from '@luzzle/web.pieces'
	import type { PieceTemplateData } from '@luzzle/web.templates/pieces/fields'
	import { getPieceHelpers } from '#lib/pieces/helpers.js'

	type Props = {
		piece: PublicWebPiece & { templates?: PieceTemplateData }
		size: { width: number; height?: number }
		lazy?: boolean
		active?: boolean
	}
	let { piece, size, lazy = false, active = false }: Props = $props()
	const Icon = $derived(getIcon(piece.templates?.icon.name))
	const fields = $derived(piece.templates?.icon.fields ?? {})
	const helpers = $derived(getPieceHelpers(piece))
</script>

<Icon {piece} {fields} {size} {lazy} {active} {helpers} />
