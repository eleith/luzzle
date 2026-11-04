<script lang="ts">
	import IconViewport from '#lib/pieces/viewer/IconViewport.svelte'
	import type { PageProps } from './$types'
	let { data }: PageProps = $props()
</script>

<IconViewport piece={data.piece} />
