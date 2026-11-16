<script lang="ts">
	import PieceLayout from '../../pieces/[piece]/[slug]/+layout@.svelte'

	let { children } = $props()
</script>

<PieceLayout {children} />
