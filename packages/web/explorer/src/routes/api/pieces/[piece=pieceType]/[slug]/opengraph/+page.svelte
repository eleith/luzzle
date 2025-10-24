<script lang="ts">
	import Opengraph from '$lib/pieces/components/opengraph.svelte'
	let { data } = $props()
</script>

<Opengraph piece={data.piece} palette={data.palette} />
