<script lang="ts">
	import LoadIcon from '@luzzle/web.templates/icons/client'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'
	import ListingIconPlaceholder from './ListingIconPlaceholder.svelte'

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

{#snippet placeholder()}
	<ListingIconPlaceholder width={size.width} />
{/snippet}

<LoadIcon name={piece.templates.icon.name} pending={placeholder} failed={placeholder}>
	{#snippet children(Icon)}
		<Icon {piece} {fields} {size} {lazy} {active} {helpers} />
	{/snippet}
</LoadIcon>
