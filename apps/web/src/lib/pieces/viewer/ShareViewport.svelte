<script lang="ts">
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import { OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'
	import ShareCardFrame from './ShareCardFrame.svelte'
	import TemplateStylesheets from '#lib/templates/TemplateStylesheets.svelte'
	import Opengraph from '@luzzle/web.templates/opengraphs/default'

	let {
		piece,
		publishedAt,
		renderedOpengraph
	}: {
		piece: TemplatedPiece
		renderedOpengraph: { html: string; css: string } | 'failed' | null
		publishedAt?: number | null
	} = $props()
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
	<section aria-labelledby="share-html-heading">
		<h2 id="share-html-heading">HTML</h2>
		{#if renderedOpengraph === 'failed'}
			<p role="alert">The configured share HTML could not be rendered.</p>
		{:else if renderedOpengraph}
			{#if renderedOpengraph.css}
				<TemplateStylesheets stylesheets={[renderedOpengraph.css]} />
			{/if}
			<ShareCardFrame>
				<!-- Keep the trusted SSR fragment and its hydration markers inside one root. -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html `<div style="display:contents">${renderedOpengraph.html}</div>`}
			</ShareCardFrame>
		{:else}
			<ShareCardFrame>
				<Opengraph
					{piece}
					fields={piece.templates.opengraph.fields}
					helpers={getPieceHelpers(piece)}
				/>
			</ShareCardFrame>
		{/if}
	</section>
	<section aria-labelledby="share-image-heading">
		<h2 id="share-image-heading">Image</h2>
		{#if imageUrl}
			{#if failedUrl === imageUrl}
				<p role="status">The generated image could not be loaded.</p>
			{/if}
			<a
				href={imageUrl}
				target="_blank"
				rel="external noopener noreferrer"
				aria-label="Open generated Takumi PNG for {piece.title} in a new tab"
				style:max-width="min({OpengraphImageWidth}px, calc(80svh * {OpengraphImageWidth} / {OpengraphImageHeight}))"
			>
				{#if failedUrl === imageUrl}
					Open image
				{:else}
					<img
						src={imageUrl}
						alt="Generated share image for {piece.title}"
						width={OpengraphImageWidth}
						height={OpengraphImageHeight}
						onerror={() => (failedUrl = imageUrl)}
					/>
				{/if}
			</a>
		{:else}
			<p>No generated image available.</p>
		{/if}
	</section>
</main>

<style>
	/* Match the worker's fixed root typography. The selector stops matching when Share unmounts. */
	:global(:root):has(.share-viewport) {
		font-size: calc(var(--font-size-root) * 1px);
	}
	.share-viewport {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-surface-container-low);
		color: var(--color-on-surface);
	}
	section {
		width: 100%;
		min-width: 0;
	}
	h2 {
		margin: 0 0 var(--space-2);
		font-size: var(--font-size-small);
	}
	a {
		display: block;
		width: 100%;
		margin-inline: auto;
	}
	img {
		display: block;
		width: 100%;
		height: auto;
		max-height: 80svh;
		object-fit: contain;
	}
</style>
