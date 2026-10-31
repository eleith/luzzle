<script lang="ts">
	import ShareViewport from '#lib/pieces/viewer/ShareViewport.svelte'
	import type { PageProps } from './$types'
	let { data }: PageProps = $props()
</script>

<ShareViewport piece={data.piece} />
