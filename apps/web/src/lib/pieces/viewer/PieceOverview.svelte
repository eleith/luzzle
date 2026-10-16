<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
	import AssetOutputs from './AssetOutputs.svelte'

	let {
		title,
		assets,
		fileUrl,
		assetsHeading = 'Outputs',
		children
	}: {
		title: string
		assets?: PublicWebPieceAsset[]
		fileUrl: (path: string) => string | undefined
		assetsHeading?: string
		children?: Snippet
	} = $props()
</script>

<section class="overview" aria-label="Piece overview">
	<h1>{title}</h1>
	{@render children?.()}
	{#if assets !== undefined}<AssetOutputs {assets} {fileUrl} heading={assetsHeading} />{/if}
</section>

<style>
	.overview {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-6);
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		max-width: 1100px;
		margin-inline: auto;
		padding: var(--space-8) var(--space-4);
		color: var(--color-on-surface);
	}
	h1 {
		font-size: var(--font-size-large);
		font-weight: var(--font-weight-bold);
		line-height: 1.3;
		overflow-wrap: anywhere;
	}
	.overview :global(.overview-facts) {
		min-width: 0;
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-large);
		overflow: hidden;
		background: var(--color-surface-container-low);
	}
	.overview :global(.overview-facts table) {
		width: 100%;
		table-layout: fixed;
		border-collapse: collapse;
		font-size: var(--font-size-xs);
	}
	.overview :global(.overview-facts caption) {
		padding: var(--space-2) var(--space-3);
		text-align: left;
		font-weight: var(--font-weight-bold);
		background: var(--color-surface-container);
	}
	.overview :global(.overview-facts th),
	.overview :global(.overview-facts td) {
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-outline-variant);
		text-align: left;
		vertical-align: top;
		overflow-wrap: anywhere;
	}
	.overview :global(.overview-facts th) {
		width: 32%;
		font-weight: var(--font-weight-medium);
		color: var(--color-on-surface-variant);
	}
	.overview :global(.overview-facts .status) {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		font-size: inherit;
		font-weight: var(--font-weight-medium);
		background: var(--color-surface-container-highest);
		color: var(--color-on-surface-variant);
	}
	.overview :global(.overview-facts .status[data-status='matching']),
	.overview :global(.overview-facts .status[data-status='completed']) {
		background: var(--color-primary-container);
		color: var(--color-on-primary-container);
	}
	.overview :global(.overview-facts .status[data-status='changed']),
	.overview :global(.overview-facts .status[data-status='running']) {
		background: var(--color-secondary-container);
		color: var(--color-on-secondary-container);
	}
	.overview :global(.overview-facts .status[data-status='failed']) {
		background: var(--color-error-container);
		color: var(--color-on-error-container);
	}
	@media (max-width: 600px) {
		.overview {
			padding-block: var(--space-4);
		}
		.overview :global(.overview-facts table),
		.overview :global(.overview-facts caption),
		.overview :global(.overview-facts tbody) {
			display: block;
		}
		.overview :global(.overview-facts tr) {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
			border-top: 1px solid var(--color-outline-variant);
			padding: 0;
			align-items: start;
		}
		.overview :global(.overview-facts th),
		.overview :global(.overview-facts td) {
			display: block;
			width: auto;
			min-width: 0;
			padding: var(--space-2) var(--space-3);
			border: 0;
		}
	}
</style>
