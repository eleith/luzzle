<script lang="ts">
	import ClientIcon from '#lib/pieces/viewer/ClientIcon.svelte'
	import type { PageProps } from './$types'
	let { data }: PageProps = $props()
</script>

<ClientIcon piece={data.piece} />
