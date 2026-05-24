<script lang="ts">
	import Opengraph from '$lib/pieces/components/opengraph.svelte'
	import { page } from '$app/state'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()

	const isHtml = $derived(page.url.searchParams.has('html'))
	const ogAsset = $derived(data.piece?.assets.find((a) => a.transformation === 'opengraph'))
	const ogPngUrl = $derived(
		ogAsset ? `/editor/preview/${data.jobId}/asset/${ogAsset.asset_path}` : ''
	)
</script>

{#if data.status === 'completed' && data.piece}
	<div class="og-preview-viewport">
		{#if isHtml}
			<Opengraph piece={data.piece} />
		{:else if ogPngUrl}
			<img src={ogPngUrl} alt="Open Graph PNG Preview" />
		{:else}
			<div class="error">Open Graph PNG not generated yet.</div>
		{/if}
	</div>
{/if}

<style>
	.og-preview-viewport {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--space-8);
		min-height: 80vh;
		background-color: var(--color-surface-container-low);
	}
	img {
		box-shadow: var(--shadow-raised);
		max-width: 1200px;
		width: 100%;
		height: auto;
		border: 1px solid var(--color-outline-variant);
	}
	.error {
		color: var(--color-error);
		font-weight: var(--font-weight-semibold);
	}
</style>
