<script lang="ts">
	import ClientPage from '#lib/pieces/viewer/ClientPage.svelte'
	import type { PageProps } from './$types'
	let { data }: PageProps = $props()
</script>

<ClientPage piece={data.piece} tags={data.tags} />
