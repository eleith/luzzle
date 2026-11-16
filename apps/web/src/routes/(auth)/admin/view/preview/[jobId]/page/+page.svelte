<script lang="ts">
	import ClientPage from '#lib/pieces/viewer/ClientPage.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

{#if data.status === 'completed' && data.piece}
	<ClientPage piece={data.piece} tags={data.tags ?? []} />
{/if}
