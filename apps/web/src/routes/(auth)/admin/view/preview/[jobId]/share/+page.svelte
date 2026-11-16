<script lang="ts">
	import ShareViewport from '#lib/pieces/viewer/ShareViewport.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

{#if data.status === 'completed' && data.piece}
	<ShareViewport piece={data.piece} />
{/if}
