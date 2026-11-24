<script lang="ts">
	import ClientPage from '#lib/pieces/viewer/ClientPage.svelte'
	import RenderedPage from '#lib/templates/RenderedPage.svelte'
	import type { PageProps } from './$types'
	let { data }: PageProps = $props()
</script>

{#if data.renderedPage}
	<RenderedPage page={data.renderedPage} />
{:else}
	<ClientPage piece={data.piece} tags={data.tags} />
{/if}
