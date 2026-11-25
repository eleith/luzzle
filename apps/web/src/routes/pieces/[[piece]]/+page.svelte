<script lang="ts">
	import PieceListing from '#lib/pieces/components/PieceListing.svelte'
	import PieceGrid from '#lib/pieces/components/PieceGrid.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<PieceListing {data}>
	<PieceGrid {data} />
</PieceListing>
