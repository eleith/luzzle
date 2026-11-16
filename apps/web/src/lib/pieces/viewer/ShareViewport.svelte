<script lang="ts">
	import type { PublicWebPiece } from '@luzzle/web.pieces'
	import { OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
	import { getPieceHelpers } from '#lib/pieces/helpers.js'

	let { piece, publishedAt }: { piece: PublicWebPiece; publishedAt?: number | null } = $props()
	const asset = $derived(piece.assets.find((asset) => asset.transformation === 'opengraph'))
	const assetUrl = $derived(
		asset ? getPieceHelpers(piece).getPieceAssetUrl(asset.asset_key, 'opengraph') : undefined
	)
	// Published paths are reused, but their responses are cached as immutable.
	const imageUrl = $derived(
		assetUrl && publishedAt != null ? `${assetUrl}?v=${publishedAt}` : assetUrl
	)
	let failedUrl = $state<string>()
</script>

<main id="main-content" class="share-viewport" aria-label="Share">
	{#if imageUrl}
		{#if failedUrl === imageUrl}
			<p role="status">The generated share image could not be loaded.</p>
		{/if}
		<a
			href={imageUrl}
			target="_blank"
			rel="external noopener noreferrer"
			aria-label="Open share image for {piece.title} in a new tab"
			style:max-width="{OpengraphImageWidth}px"
		>
			{#if failedUrl === imageUrl}
				Open image in a new tab
			{:else}
				<img
					src={imageUrl}
					alt="Share image for {piece.title}"
					width={OpengraphImageWidth}
					height={OpengraphImageHeight}
					onerror={() => (failedUrl = imageUrl)}
				/>
			{/if}
		</a>
	{:else}
		<p>No generated share image is available. Publish or generate a fresh preview to create one.</p>
	{/if}
</main>

<style>
	.share-viewport {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-surface-container-low);
		color: var(--color-on-surface);
	}
	a {
		display: block;
		width: 100%;
	}
	img {
		display: block;
		width: 100%;
		height: auto;
		max-height: 80svh;
		object-fit: contain;
	}
</style>
