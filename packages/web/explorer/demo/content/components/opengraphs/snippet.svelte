<script lang="ts">
	import { type PieceOpengraphProps } from '$lib/pieces/helpers'
	import Icon from '$lib/pieces/components/icon.svelte'

	let { piece }: PieceOpengraphProps = $props()

	const titleSize = piece.title.length < 25 ? 3.5 : 2.2

	$effect(() => {
		document.documentElement.setAttribute('data-theme', 'dark')
	})
</script>

<section class="container" data-theme="dark">
	<h1 style="--font-size:{titleSize}rem">
		{piece.title}
	</h1>
	<div class="icon-container">
		<Icon {piece} size={{ width: 800 }} lazy={false} />
	</div>
</section>

<style>
	section.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		height: 100%;
		background: var(--color-on-tertiary-container);
		overflow: hidden;
		padding-top: 40px;
		gap: 30px;
		border-bottom: solid var(--color-secondary) 10px;
	}

	h1 {
		font-size: var(--font-size);
		font-weight: 700;
		margin: 0;
		color: var(--color-on-surface);
		text-align: center;
		padding: 0 60px;
		max-width: 90%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.icon-container {
		flex-shrink: 0;
	}
</style>
