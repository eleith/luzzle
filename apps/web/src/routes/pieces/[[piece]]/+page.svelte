<script lang="ts">
	import PieceListing from '#lib/pieces/components/PieceListing.svelte'
	import ClientListingIcon from '#lib/pieces/components/ClientListingIcon.svelte'
	import { listingIconPlacement } from '#lib/pieces/listing-icon-placement.js'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<PieceListing {data}>
	{#snippet icon(piece, index, active)}
		<ClientListingIcon {piece} {...listingIconPlacement(index)} {active} />
	{/snippet}
</PieceListing>
