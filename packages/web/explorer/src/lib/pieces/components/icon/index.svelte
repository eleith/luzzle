<script lang="ts">
	import { type WebPieces } from '$lib/pieces/types'
	import Cartridge from './cartridge.svelte'
	import Poster from './poster.svelte'
	import Article from './article.svelte'
	import Book from './book.svelte'
	import PlayingCard from './playing-card.svelte'

	type Props = {
		piece: WebPieces
		size?: 'small' | 'medium' | 'large'
		active?: boolean
		lazy?: boolean
	}

	let { piece, size, active, lazy }: Props = $props()
	let metadata = $derived(piece.json_metadata ? JSON.parse(piece.json_metadata) : {})
</script>

{#if piece.type === 'games'}
	{#if metadata.type === 'video'}
		<Cartridge {piece} {active} {size} {lazy} />
	{:else}
		<PlayingCard {piece} {active} {size} {lazy} />
	{/if}
{:else if piece.type === 'links' || piece.type === 'texts'}
	<Article {piece} {size} {active} {lazy} />
{:else if piece.type === 'books'}
	<Book {piece} {active} {size} {lazy} transform={{ active: 'rotateX(10deg) rotateY(-45deg)' }} />
{:else}
	<Poster {piece} {active} {size} {lazy} />
{/if}
