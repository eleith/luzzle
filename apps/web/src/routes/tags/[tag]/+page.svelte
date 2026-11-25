<script lang="ts">
	import { page } from '$app/state'
	import { publicPageUrl } from '#lib/pieces/navigation.js'
	import { publicPieceHref } from '@luzzle/web.pieces'
	import PieceListing from '#lib/pieces/components/PieceListing.svelte'
	import PieceGrid from '#lib/pieces/components/PieceGrid.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<svelte:head>
	{#if data.page === 1 && !data.nextPage && data.pieces.length === 1}
		<link
			rel="canonical"
			href={publicPageUrl(
				page.data.config.url.app,
				page.url.origin,
				publicPieceHref(data.pieces[0])
			)}
		/>
	{/if}
</svelte:head>

<PieceListing {data} heading="Tag: #{data.tag}">
	<PieceGrid {data} />
</PieceListing>
