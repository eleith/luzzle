<script lang="ts">
	import ClientIcon from '#lib/pieces/viewer/ClientIcon.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

{#if data.status === 'completed' && data.piece}
	<ClientIcon piece={data.piece} />
{/if}
