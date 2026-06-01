<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
</script>

{#if data.status === 'completed' && data.piece}
	<div class="icon-preview-viewport">
		<PieceIcon piece={data.piece} size={{ width: 500 }} lazy={false} />
	</div>
{/if}

<style>
	.icon-preview-viewport {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--space-8);
		min-height: 80vh;
		background-color: var(--color-surface-container-low);
	}
	:global(.icon-preview-viewport > *) {
		box-shadow: var(--shadow-raised);
		border: 1px solid var(--color-outline-variant);
	}
</style>
