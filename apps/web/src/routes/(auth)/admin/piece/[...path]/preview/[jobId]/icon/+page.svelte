<script lang="ts">
	import IconViewport from '#lib/pieces/viewer/IconViewport.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

{#if data.status === 'completed' && data.piece}
	<IconViewport piece={data.piece} />
{/if}
