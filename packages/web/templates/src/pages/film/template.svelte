<script lang="ts">
	import { formatPieceByline, safeExternalUrl } from '@luzzle/web.pieces'
	import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
	import type { Fields } from './schema.js'

	type Props = {
		piece: PublicWebPiece
		fields: Fields
		tags: Array<{ slug: string; tag: string }>
		helpers: PieceComponentHelpers
	}
	let { piece, fields, tags, helpers }: Props = $props()
	const palette = $derived(helpers.getPiecePalette())
	const byline = $derived(
		formatPieceByline(piece.date_consumed, fields.dateReleased, fields.runtime)
	)
	const people = $derived(
		fields.people?.map((person) => (typeof person === 'string' ? person : person.name)).join(', ')
	)
	const link = $derived(safeExternalUrl(fields.url))
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 125, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 125, 'avif') : undefined
	)
</script>

<main>
	<section
		class="hero"
		style="--poster-background-color: {palette?.background ||
			'var(--color-surface-container)'}; --poster-title-color: {palette?.titleText ||
			'var(--color-on-surface)'}; --backdrop-accent: {palette?.accent ||
			'var(--color-outline-variant)'}"
	>
		<div class="hero-inner">
			<div class="hero-text">
				<h1>{piece.title}</h1>
			</div>
			<div class="hero-icon">
				{#if fields.image}
					<div
						class="poster"
						inert
						style="--piece-icon-scale: {Math.round((125 / 375) * 100) /
							100}; --piece-icon-width: 125px; --piece-icon-height: 187.5px;"
					>
						<div class="poster-title">{piece.title}</div>
						{#if imageUrl}
							<picture>
								<source srcset={imageAvif} type="image/avif" />
								<img src={imageUrl} loading="eager" fetchpriority="high" alt="" />
							</picture>
						{/if}
					</div>
				{/if}
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
					{#if piece.note}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html helpers.getPieceAssetContent(piece.key, 'markdown') || piece.note}
					{:else}
						<em class="empty-note">this record does not have a note</em>
					{/if}
				</div>
			</section>

			{#if link || fields.isbn || fields.category || piece.summary || people || fields.backdrop}
				<section class="supplemental">
					{#if link || fields.isbn}
						<div class="supplemental-inner">
							<h2>Link</h2>
							<div class="body">
								{#if link}
									<a class="article-link" href={link}>{link}</a>
								{:else if fields.isbn}
									<a
										class="article-link"
										href="https://openlibrary.org/search?isbn={encodeURIComponent(fields.isbn)}"
										>isbn {fields.isbn}</a
									>
								{/if}
							</div>
						</div>
					{/if}

					{#if fields.category}
						<div class="supplemental-inner">
							<h2>Type</h2>
							<div class="body">{fields.category}</div>
						</div>
					{/if}

					{#if piece.summary}
						<div class="supplemental-inner">
							<h2>Description</h2>
							<div class="body">
								{piece.summary}
							</div>
						</div>
					{/if}

					{#if people}
						<div class="supplemental-inner">
							<h2>People</h2>
							<div class="body people">{people}</div>
						</div>
					{/if}

					{#if fields.backdrop}
						<div class="supplemental-inner">
							<h2>Backdrop</h2>
							<picture class="backdrop-picture">
								<source
									srcset={helpers.getPieceImageUrl(fields.backdrop, 800, 'avif')}
									type="image/avif"
								/>
								<img
									src={helpers.getPieceImageUrl(fields.backdrop, 800, 'jpg')}
									loading="lazy"
									alt=""
								/>
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
	.poster {
		width: var(--piece-icon-width);
		height: var(--piece-icon-height);
		display: flex;
		position: relative;
		justify-content: center;
		align-items: center;
		background: white;
		color: black;
		font-size: calc(3rem * var(--piece-icon-scale));
		border: calc(10px * var(--piece-icon-scale)) solid white;
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		text-align: center;
		line-height: 1.2;
		padding: calc(1rem * var(--piece-icon-scale));
		word-break: break-all;
		overflow: hidden;
	}
	.poster-title {
		position: relative;
	}
	.poster img {
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		object-fit: cover;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	section.hero {
		background: var(--poster-background-color);
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
		color: var(--poster-title-color);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.byline-section {
		padding: var(--space-1) 0;
		background: oklch(from var(--poster-background-color) 0.22 c h);
		color: #fff;
		z-index: 1;
	}

	.byline-inner {
		margin: auto;
		width: 85%;
		padding: 0 var(--space-2-5);
	}

	.byline {
		font-size: var(--font-size-xs);
		color: inherit;
		letter-spacing: 0.02em;
		margin: 0;
		text-align: left;
	}

	.hero-icon {
		display: flex;
		justify-content: center;
		position: relative;
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

	.backdrop-picture {
		width: 100%;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: 4px 8px 20px var(--color-shadow);
	}

	.backdrop-picture img {
		width: 100%;
		height: auto;
		display: block;
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

		.byline-inner {
			width: clamp(500px, 66.6666%, 800px);
		}

		.byline-section {
			z-index: auto;
		}
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

	.people {
		font-size: var(--font-size-xxs);
		line-height: 2;
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
