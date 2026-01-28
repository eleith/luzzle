<script lang="ts">
	import PiecePage from '$lib/pieces/components/page.svelte'
	import { type PieceMode } from '$lib/pieces/helpers.js'
	import { setContext } from 'svelte'

	let { data } = $props()
	setContext<PieceMode>('piece-mode', 'preview')
</script>

<PiecePage
	piece={data.piece}
	tags={data.tags}
	metadata={data.metadata}
	html_note={data.html_note}
/>
