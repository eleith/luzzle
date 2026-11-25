<script lang="ts">
	import SeoHead from '#lib/components/layout/simple/SeoHead.svelte'
	import DefaultPage from '#lib/templates/page.svelte'
	import RenderedPage from '#lib/templates/RenderedPage.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<SeoHead />
{#if data.renderedPage}
	<RenderedPage page={data.renderedPage} />
{:else}
	<DefaultPage piece={data.piece} tags={data.tags} />
{/if}
