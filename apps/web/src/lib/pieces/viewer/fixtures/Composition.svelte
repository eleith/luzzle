<script lang="ts">
	import type { PublicWebPiece } from '@luzzle/web.pieces'
	import { getPieceHelpers } from '#lib/pieces/helpers.js'
	let { piece }: { piece: PublicWebPiece } = $props()
	const helpers = $derived(getPieceHelpers(piece))
</script>

<section data-renderer="composition">
	<h2>{piece.title}</h2>
	<img src={helpers.getPieceImageUrl('cover', 500, 'jpg')} alt="Piece cover within composition" />
</section>
