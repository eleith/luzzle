<script>
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import PiecePage from '$lib/pieces/components/page.svelte'
	import PieceIcon from '$lib/pieces/components/icon.svelte'
	import PieceOpengraph from '$lib/pieces/components/opengraph.svelte'

	let { data } = $props()
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html data.role === 'feed' ? data.head : ''}
</svelte:head>

{#if data.role === 'page'}
	<PiecePage piece={data.piece} tags={data.tags} />
{:else if data.role === 'icon'}
	<PieceIcon piece={data.piece} size={{ width: 125 }} lazy active />
{:else if data.role === 'opengraph'}
	<PieceOpengraph piece={data.piece} />
{:else}
	{#if data.navBanner !== null}
		<NavBanner {...data.navBanner} />
	{/if}
	<p id="selected-revision">{data.state}</p>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html data.body}
{/if}
