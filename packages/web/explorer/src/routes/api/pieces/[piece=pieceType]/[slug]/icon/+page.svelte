<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon.svelte'
	import { setContext } from 'svelte'

	let { data } = $props()
	setContext('piece-mode', data.mode)
</script>

<PieceIcon piece={data.piece} size="l" lazy={false} />
