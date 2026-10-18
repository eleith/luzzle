<script>
	let { data, helpers, options = {} } = $props();
	const bound = $derived(helpers.forPiece(data.piece));
</script>

<a class="default-icon" class:active={options.active} href={bound.getUrl()}>
	{data.piece.title ?? data.piece.id}
</a>

<style>
	.default-icon {
		color: var(--color-primary);
	}
	.default-icon.active {
		color: var(--color-on-surface);
	}
</style>
