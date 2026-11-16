<script>
	import PiecePage from '#lib/pieces/components/page.svelte'
	import PieceIcon from '#lib/pieces/components/icon.svelte'

	let { data } = $props()
</script>

{#if data.role === 'page'}
	<PiecePage piece={data.piece} tags={data.tags} />
{:else if data.role === 'icon'}
	<PieceIcon piece={data.piece} size={{ width: 125 }} lazy active />
{/if}
