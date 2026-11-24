<script lang="ts">
	import PreviewIcon from '#lib/pieces/viewer/PreviewIcon.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

{#if data.status === 'completed' && data.piece}
	<PreviewIcon piece={data.piece} renderedIcon={data.renderedIcon} />
{/if}
