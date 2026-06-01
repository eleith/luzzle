<script lang="ts">
	import Opengraph from '$lib/pieces/components/opengraph.svelte'
	import { page } from '$app/state'
	import { onMount } from 'svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()

	const isHtml = $derived(page.url.searchParams.has('html'))
	const ogAsset = $derived(data.piece?.assets.find((a) => a.transformation === 'opengraph'))
	const ogPngUrl = $derived(
		ogAsset ? `/admin/preview/${data.jobId}/asset/${ogAsset.asset_path}` : ''
	)

	let ogScale = $state(1)
	let scaleContainer: HTMLDivElement | undefined = $state()

	function updateScale() {
		if (!scaleContainer) return
		const available = scaleContainer.clientWidth
		ogScale = Math.min(1, available / 1200)
	}

	onMount(() => {
		updateScale()
		window.addEventListener('resize', updateScale)
		return () => window.removeEventListener('resize', updateScale)
	})
</script>

{#if data.status === 'completed' && data.piece}
	<div class="og-preview-viewport">
		{#if isHtml}
			<div class="og-scale-container" bind:this={scaleContainer}>
				<div class="og-scale-inner" style:transform="scale({ogScale})" style:width="1200px">
					<Opengraph piece={data.piece} />
				</div>
			</div>
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
	.og-scale-container {
		width: 100%;
		max-width: 1200px;
	}
	.og-scale-inner {
		transform-origin: top left;
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
