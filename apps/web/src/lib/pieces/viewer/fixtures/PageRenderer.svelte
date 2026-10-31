<script lang="ts">
	import type { PublicWebPiece } from '@luzzle/web.pieces'
	import { getPieceHelpers } from '#lib/pieces/helpers.js'
	let { piece, tags }: { piece: PublicWebPiece; tags: Array<{ slug: string; tag: string }> } =
		$props()
	const helpers = $derived(getPieceHelpers(piece))
</script>

<main id="main-content" data-renderer="page">
	<h1>{piece.title}</h1>
	<img src={helpers.getPieceImageUrl('cover', 500, 'jpg')} alt="Published cover" />
	{#each tags as tag (tag.slug)}
		<a href="/tags/{tag.slug}">{tag.tag}</a>
	{/each}
</main>
