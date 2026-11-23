<script lang="ts">
	import PieceListing from '#lib/pieces/components/PieceListing.svelte'
	import IconListing from '#lib/pieces/components/IconListing.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<PieceListing {data}>
	<IconListing {data} />
</PieceListing>
