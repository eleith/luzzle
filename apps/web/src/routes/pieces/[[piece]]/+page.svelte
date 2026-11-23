<script lang="ts">
	import IconListing from '#lib/pieces/components/IconListing.svelte'
	import ClientListingIcon from '#lib/pieces/components/ClientListingIcon.svelte'
	import { iconListingPlacement } from '#lib/pieces/icon-listing/placement.js'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<IconListing {data}>
	{#snippet fallback(piece, index, active)}
		<ClientListingIcon {piece} {...iconListingPlacement(index)} {active} />
	{/snippet}
</IconListing>
