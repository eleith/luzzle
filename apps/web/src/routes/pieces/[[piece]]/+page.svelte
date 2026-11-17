<script lang="ts">
	import PieceListing from '#lib/pieces/components/PieceListing.svelte'
	import ClientListingIcon from '#lib/pieces/components/ClientListingIcon.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<PieceListing {data}>
	{#snippet icon(piece, index, active)}
		<ClientListingIcon {piece} size={{ width: 125 }} lazy={index >= 5} {active} />
	{/snippet}
</PieceListing>
