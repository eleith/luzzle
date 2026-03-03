<script lang="ts">
	import Opengraph from '$lib/pieces/components/opengraph.svelte'
	import { setContext } from 'svelte'

	let { data } = $props()
	setContext('piece-mode', data.mode)
</script>

<Opengraph piece={data.piece} />
