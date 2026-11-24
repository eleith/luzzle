<script lang="ts">
	import ShareViewport from '#lib/pieces/viewer/ShareViewport.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

{#if data.shareUnavailable}
	<!-- The preview can expire after the viewer layout loaded the piece. -->
	<main id="main-content"><p>This share preview is no longer available.</p></main>
{:else if data.status === 'completed' && data.piece}
	<ShareViewport piece={data.piece} renderedOpengraph={data.renderedOpengraph} />
{/if}
