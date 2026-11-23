<script lang="ts">
	import ListingLayout from '../../pieces/+layout.svelte'

	import PieceListing from '#lib/pieces/components/PieceListing.svelte'
	import type { LayoutProps } from './$types'

	let { data, children }: LayoutProps = $props()
</script>

<ListingLayout>
	<PieceListing {data} {children} />
</ListingLayout>
