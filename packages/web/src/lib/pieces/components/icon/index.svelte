<script lang="ts">
	import { type WebPieces } from '$lib/pieces/types'
	import Cartridge from './cartridge.svelte'
	import Poster from './poster.svelte'
	import Article from './article.svelte'
	import Book from './book.svelte'

	type Props = {
		piece: WebPieces
		size?: 'small' | 'medium' | 'large'
		active?: boolean
	}

	let { piece, size, active }: Props = $props()
</script>

{#if piece.type === 'games'}
	<Cartridge {piece} {active} {size} />
{:else if piece.type === 'links' || piece.type === 'texts'}
	<Article {piece} {size} {active} />
{:else if piece.type === 'books'}
	<Book {piece} {active} {size} transform={{ active: 'rotateX(10deg) rotateY(-45deg)' }} />
{:else}
	<Poster {piece} {active} {size} />
{/if}
