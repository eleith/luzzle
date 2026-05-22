<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon.svelte'

	let { data } = $props()
</script>

<PieceIcon piece={data.piece} size={{ width: 500 }} lazy={false} mode="local" />
