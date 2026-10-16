<script lang="ts">
	import type { PublicWebPiece } from '@luzzle/web.pieces'
	import { getPieceHelpers } from '$lib/pieces/helpers'
	let { piece, size, lazy }: { piece: PublicWebPiece; size: { width: number }; lazy: boolean } =
		$props()
	const helpers = $derived(getPieceHelpers(piece))
</script>

<img
	data-renderer="icon"
	data-width={size.width}
	src={helpers.getPieceImageUrl('cover', size.width, 'jpg')}
	loading={lazy ? 'lazy' : 'eager'}
	alt={piece.title}
/>
