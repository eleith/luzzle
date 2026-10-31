<script lang="ts">
	import PieceIcon from '#lib/pieces/components/icon.svelte'
	import type { PageProps } from './$types'
	let { data }: PageProps = $props()
</script>

<main id="main-content" class="icon-viewport" aria-label="Piece icon">
	<div class="icon-frame">
		<PieceIcon piece={data.piece} size={{ width: 500 }} lazy={false} />
	</div>
</main>

<style>
	.icon-viewport {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		padding: var(--space-8);
		min-height: 80vh;
		overflow-x: auto;
		background: var(--color-surface-container-low);
	}
	.icon-frame {
		margin-inline: auto;
		flex-shrink: 0;
		box-shadow: var(--shadow-raised);
		border: 1px solid var(--color-outline-variant);
	}
</style>
