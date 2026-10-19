<script>
	let { data } = $props()
	const label = $derived(`${data.piece.type}: ${data.piece.title}`)
</script>

<article class="piece">{label}</article>

<style>
	.piece {
		color: var(--color-primary);
	}
</style>
