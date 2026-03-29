<script lang="ts">
	import PiecePage from '$lib/pieces/components/page.svelte'
	import { setContext } from 'svelte'

	let { data } = $props()
	setContext('piece-mode', 'preview')
</script>

<PiecePage piece={data.piece} tags={data.tags} />
