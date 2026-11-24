<script lang="ts">
	import SeoHead from '#lib/components/layout/simple/SeoHead.svelte'
	import RenderedPage from '#lib/templates/RenderedPage.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

<SeoHead />
<RenderedPage page={data.renderedPage} />
