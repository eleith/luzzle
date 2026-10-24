<script lang="ts">
	import { formatPieceDate, formatPieceYear, safeExternalUrl } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import BrowserWindow from '@luzzle/web.templates/icons/browser-window'
	import type { Fields } from './schema.js'
	import { articleBylineSource, articleReadTime } from './helpers.js'

	type Props = {
		piece: PublicWebPiece
		fields: Fields
		tags: Array<{ slug: string; tag: string }>
		helpers: PieceComponentHelpers
	}
	let { piece, fields, tags, helpers }: Props = $props()
	const palette = $derived(helpers.getPiecePalette())
	const link = $derived(safeExternalUrl(fields.url))
	const publishedYear = $derived(formatPieceYear(fields.datePublished))
	const isActive = $derived(fields.isActive ?? true)
	const isPaywalled = $derived(fields.isPaywalled ?? false)
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 800, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 800, 'avif') : undefined
	)
	const note = $derived(helpers.getPieceAssetContent(piece.key, 'markdown') || piece.note)
	const byline = $derived.by(() => {
		const parts: string[] = []
		const source = articleBylineSource(fields.author, link)
		if (source) parts.push(source)
		const readTime = articleReadTime(fields.wordCount)
		if (readTime) parts.push(readTime)
		const consumed = formatPieceDate(piece.date_consumed)
		if (consumed) parts.push(consumed)
		return parts.join(' · ')
	})
</script>

<main>
	<section
		class="hero"
		style="--hero-bg: {palette?.background ||
			'var(--color-surface-container)'}; --hero-title: {palette?.titleText ||
			'var(--color-on-surface)'}"
	>
		<div class="hero-inner">
			<div class="hero-text">
				<h1>{piece.title}</h1>
			</div>
			<div class="hero-icon">
				<BrowserWindow
					{piece}
					fields={{ image: fields.image, url: fields.url }}
					size={{ width: 250 }}
					lazy={false}
					{helpers}
				/>
			</div>
		</div>

		{#if byline}
			<section class="byline-section">
				<div class="byline-inner">
					<p class="byline">{byline}</p>
				</div>
			</section>
		{/if}
	</section>

	<section
		class="content"
		style="--byline-border: {palette?.accent || 'var(--color-outline-variant)'};"
	>
		<section class="details">
			<section>
				<h2>Note</h2>
				<div class="body">
					{#if note}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html note}
					{:else}
						<em class="empty-note">this record does not have a note</em>
					{/if}
				</div>
			</section>

			{#if link || publishedYear !== undefined || piece.summary || imageUrl}
				<section class="supplemental">
					{#if link}
						<div class="supplemental-inner">
							<h2>Link</h2>
							{#if !isActive || isPaywalled}
								<div class="link-status">
									{#if !isActive}
										dead link
									{:else if isPaywalled}
										requires subscription
									{/if}
								</div>
							{/if}
							<div class="body">
								<a class="article-link" href={link}>{link}</a>
							</div>
						</div>
					{/if}

					{#if publishedYear !== undefined}
						<div class="supplemental-inner">
							<h2>Published</h2>
							<div class="body">
								{publishedYear}
							</div>
						</div>
					{/if}

					{#if piece.summary}
						<div class="supplemental-inner">
							<h2>Summary</h2>
							<div class="body">
								{piece.summary}
							</div>
						</div>
					{/if}
					{#if imageUrl}
						<div class="supplemental-inner">
							<h2>Image</h2>
							<picture class="cover-picture">
								<source srcset={imageAvif} type="image/avif" />
								<img src={imageUrl} loading="lazy" alt="Image for {piece.title}" />
							</picture>
						</div>
					{/if}
				</section>
			{/if}

			{#if tags.length}
				<div class="section">
					<div class="tags-container">
						{#each tags as tag (tag.slug)}
							<a href="/tags/{encodeURIComponent(tag.slug)}" class="tag"
								>#{tag.tag?.toLowerCase()}</a
							>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	</section>
</main>

<style>
	section.hero {
		background: var(--hero-bg);
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	.hero-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-5);
		margin: auto;
		width: 85%;
		padding: var(--space-3);
	}

	.hero-text {
		text-align: center;
	}

	.hero-text h1 {
		font-size: var(--font-size-xl, 1.5rem);
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.01em;
		color: var(--hero-title);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.hero-icon {
		display: flex;
		justify-content: center;
		overflow: visible;
		max-height: 100px;
		margin-bottom: -1.5rem; /* Overlap byline row */
		animation: hero-icon-rise 800ms ease-in-out both;
	}

	@keyframes hero-icon-rise {
		from {
			transform: translateY(120%);
		}
		to {
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-icon {
			animation: none;
		}
	}

	@media screen and (min-width: 768px) {
		section.hero {
			min-height: 100px;
			padding-bottom: 0;
			box-sizing: border-box;
		}

		.hero-inner {
			flex-direction: row;
			justify-content: space-between;
			width: clamp(500px, 66.6666%, 800px);
			height: 100%;
			padding-bottom: var(--space-4);
		}

		.hero-text {
			text-align: left;
			flex: 1;
			align-self: center;
		}

		.hero-icon {
			align-self: flex-end;
			margin-bottom: -2.2rem; /* Touches bottom border */
		}
	}

	.byline-section {
		padding: var(--space-1) 0;
		background: oklch(from var(--hero-bg) 0.22 c h);
		color: #fff;
		z-index: 1;
	}

	.byline-inner {
		margin: auto;
		width: 85%;
		padding: 0 var(--space-2-5);
	}

	@media screen and (min-width: 768px) {
		.byline-inner {
			width: clamp(500px, 66.6666%, 800px);
		}

		.byline-section {
			z-index: auto;
		}
	}

	.byline {
		font-size: var(--font-size-xs);
		color: inherit;
		letter-spacing: 0.02em;
		margin: 0;
		text-align: left;
	}

	section.content {
		width: 100%;
		position: relative;
		border-top: solid 2px var(--byline-border);
	}

	section.details {
		display: flex;
		flex-direction: column;
		margin: auto;
		gap: var(--space-6, 1.5rem);
		width: 85%;
		padding-right: var(--space-2-5);
		padding-left: var(--space-2-5);
		padding-bottom: var(--space-5);
		padding-top: var(--space-5);
	}

	@media screen and (min-width: 768px) {
		section.details {
			width: clamp(500px, 66.6666%, 800px);
		}
	}

	section.details > section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	section.details h2 {
		font-size: var(--font-size-xxs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-on-surface-variant);
		margin: 0;
	}

	.body {
		font-size: var(--font-size-small, 0.95rem);
		line-height: 1.7;
		color: var(--color-on-surface);
	}

	.empty-note {
		color: var(--color-on-surface-variant);
		font-style: italic;
	}

	.link-status {
		font-size: var(--font-size-xxs);
		color: var(--color-error);
	}

	.supplemental {
		background: var(--color-surface-container-lowest);
		padding: var(--space-5) 0;
		margin-left: calc(-50vw + 50%);
		margin-right: calc(-50vw + 50%);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.supplemental-inner {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 85%;
		padding: 0 var(--space-2-5);
	}

	.supplemental-inner + .supplemental-inner {
		margin-top: var(--space-5);
	}

	@media screen and (min-width: 768px) {
		.supplemental-inner {
			width: clamp(500px, 66.6666%, 800px);
		}
	}

	.cover-picture {
		display: flex;
		justify-content: center;
		width: 100%;
		max-width: 800px;
		margin-inline: auto;
	}

	.cover-picture img {
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 500px;
		display: block;
		border-radius: 4px;
		box-shadow: 4px 8px 20px var(--color-shadow);
	}

	.article-link {
		font-size: var(--font-size-xs);
		word-break: break-all;
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		font-size: var(--font-size-xxs);
	}

	.tags-container .tag {
		text-decoration: none;
		color: var(--color-on-surface);
		opacity: 0.6;
		padding: var(--space-1);
		border-radius: 5px;
		border: 1px solid var(--color-surface-container-lowest);
		transition: all 0.1s ease-in-out;
	}

	.tags-container .tag:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
		background-color: var(--color-surface-container-lowest);
		opacity: 1;
	}
</style>
