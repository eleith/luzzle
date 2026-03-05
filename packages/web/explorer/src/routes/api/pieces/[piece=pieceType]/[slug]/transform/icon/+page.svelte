<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon.svelte'
	import { setContext } from 'svelte'

	let { data } = $props()
	setContext('piece-mode', 'local')
</script>

<PieceIcon piece={data.piece} metadata={data.piece.metadata} size={{ width: 500 }} lazy={false} />
