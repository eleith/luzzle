<script lang="ts">
	import TemplatePage from '#lib/templates/page.svelte'
	import RenderedPage from '#lib/templates/RenderedPage.svelte'
	import type { PageProps } from './$types'
	let { data }: PageProps = $props()
</script>

{#if data.renderedPage}
	<RenderedPage page={data.renderedPage} />
{:else}
	<TemplatePage piece={data.piece} tags={data.tags} />
{/if}
