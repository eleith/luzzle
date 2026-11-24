<script lang="ts">
	import PreviewIcon from '#lib/pieces/viewer/PreviewIcon.svelte'
	import type { PageProps } from './$types'
	let { data }: PageProps = $props()
</script>

<PreviewIcon piece={data.piece} renderedIcon={data.renderedIcon} />
