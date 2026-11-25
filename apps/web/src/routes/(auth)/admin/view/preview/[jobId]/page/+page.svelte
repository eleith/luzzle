<script lang="ts">
	import TemplatePage from '#lib/templates/page.svelte'
	import RenderedPage from '#lib/templates/RenderedPage.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

{#if data.pageUnavailable}
	<!-- A job can expire between loading the viewer layout and opening the Page tab. -->
	<main id="main-content"><p>This preview page is no longer available.</p></main>
{:else if data.status === 'completed' && data.piece}
	{#if data.renderedPage}
		<RenderedPage page={data.renderedPage} />
	{:else}
		<TemplatePage piece={data.piece} tags={data.tags ?? []} />
	{/if}
{/if}
