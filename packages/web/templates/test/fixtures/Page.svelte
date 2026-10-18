<script>
	import { getContext, setContext, onDestroy } from 'svelte';

	let { data, helpers, components } = $props();
	const { NavBanner, PieceIcon } = $derived(components);
	const requestId = getContext('fixture-request');
	setContext('fixture-parent', requestId);
	onDestroy(() => helpers.destroyed(requestId));
	const first = $derived(helpers.forPiece(data.pieces[0]));
	const second = $derived(helpers.forPiece(data.pieces[1]));
	const literal = 'svelte/internal/server';
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="fixture-request" content={requestId} />
</svelte:head>

<NavBanner background={data.background} showRandom={true} />
<main data-request={requestId}>
	<h1>{data.title}</h1>
	<p class="helper-output">{first.getUrl()}|{second.getUrl()}|{first.getUrl()}</p>
	<p>{literal}</p>
	{#each data.pieces as piece (piece.id)}
		<PieceIcon {piece} size={{ width: 80, height: 120 }} active={piece.id === 'first'} />
	{/each}
</main>

<style>
	.helper-output {
		color: var(--color-primary);
	}
</style>
