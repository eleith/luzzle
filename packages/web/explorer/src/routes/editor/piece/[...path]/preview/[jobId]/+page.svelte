<script lang="ts">
	import PiecePage from '$lib/pieces/components/page.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

{#if data.status === 'completed' && data.piece}
	<PiecePage piece={data.piece} tags={data.tags} />
{/if}
