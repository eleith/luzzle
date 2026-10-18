<script>
	import { getContext } from 'svelte';

	let { data, options, helpers } = $props();
	const parent = getContext('fixture-parent');
	const bound = $derived(helpers.forPiece(data.piece));
</script>

<svelte:head>
	<meta name="fixture-icon" content={data.piece.id} />
</svelte:head>

<a
	class="custom-icon"
	class:active={options.active}
	data-parent={parent}
	data-width={options.size.width}
	href={bound.getUrl()}
>
	{data.piece.title}
</a>

<style>
	.custom-icon {
		color: var(--color-on-surface);
	}
	.custom-icon.active {
		color: var(--color-primary);
	}
</style>
