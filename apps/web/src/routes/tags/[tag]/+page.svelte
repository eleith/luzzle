<script lang="ts">
	import { page } from '$app/state'
	import { publicPageUrl, publicPieceHref } from '#lib/pieces/navigation.js'
	import PieceListing from '#lib/pieces/components/PieceListing.svelte'
	import IconListing from '#lib/pieces/components/IconListing.svelte'
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
	<IconListing {data} />
</PieceListing>
