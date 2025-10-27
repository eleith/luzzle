<script lang="ts">
	import PiecePage from '$lib/pieces/components/page.svelte'

	let { data } = $props()
</script>

<PiecePage piece={data.piece} tags={data.tags} metadata={data.metadata} html={data.html} />
