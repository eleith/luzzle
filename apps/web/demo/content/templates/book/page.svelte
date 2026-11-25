<script lang="ts">
	import type { PageProps } from '../props'
	import type { BookPageFields } from '../fields'

	let { piece, fields, tags, helpers }: PageProps<BookPageFields> = $props()
	const palette = $derived(helpers.getPiecePalette())
	helpers.requestNavBar({
		showRandom: true,
		background: palette?.background || 'var(--color-surface-container)',
		color: palette?.bodyText,
		hoverColor: palette?.accent
	})
	const link = $derived(helpers.safeExternalUrl(fields.url))
	const coverUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 500, 'jpg') : undefined
	)
	const coverAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 500, 'avif') : undefined
	)
	const byline = $derived.by(() => {
		const parts: string[] = []
		if (fields.author) parts.push(`by ${fields.author}`)
		if (fields.pages !== undefined) parts.push(`${fields.pages} pages`)
		const consumed = helpers.formatPieceDate(piece.date_consumed)
		if (consumed) parts.push(consumed)
		return parts.join(' · ')
	})

	// The package page places its book cover at 125px, independent of the full-size cover below.
	const heroWidth = 125
	const scale = Math.round((heroWidth / 375) * 100) / 100
	const thickness = $derived(
		helpers.interpolate(
			(fields.pages ?? 100) * scale,
			{ min: 1, max: 650 },
			{ min: 25, max: heroWidth / 2 }
		)
	)
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, heroWidth, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, heroWidth, 'avif') : undefined
	)
</script>

{#snippet bookCover()}
	<div
		class="book"
		inert
		style="
			--book-spine-color: black;
			--book-spine-text-color: white;
			--book-pages-color: #fff;
			--book-book-color: black;
			--book-book-text-color: white;
			--book-transform-display: block;
			--book-transition: transform 0.75s ease;
			--book-scale: {scale};
			--book-shadow-color: transparent;
			--book-thickness: {thickness}px;
			--book-width: {heroWidth}px;
			--book-height: {(heroWidth * 3) / 2}px;"
	>
		<div class="book-shadow"></div>
		<div class="book-spine">
			<div class="book-spine-text">
				<span class="book-spine-author">
					{fields.author ?? ''}
				</span>
				<span class="book-spine-title">
					{piece.title}
				</span>
			</div>
		</div>
		<div class="book-pages"></div>
		<div class="book-pages-bottom"></div>
		<div class="book-pages-top"></div>
		<div class="book-back"></div>
		<div class="book-cover">
			<div class="book-cover-front">
				{piece.title}
			</div>
			{#if imageUrl}
				<picture>
					<source srcset={imageAvif} type="image/avif" />
					<img src={imageUrl} loading="eager" fetchpriority="high" alt="" />
				</picture>
			{/if}
		</div>
	</div>
{/snippet}

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
			{@render bookCover()}
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
					{@const renderedNote = helpers.getPieceAssetContent(piece.key, 'markdown')}
					{#if renderedNote}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html renderedNote}
					{:else}
						{piece.note}
					{/if}
				{:else}
					<em class="empty-note">this record does not have a note</em>
				{/if}
			</div>
		</section>

		{#if link || fields.isbn || fields.publicationYear !== undefined || piece.summary || coverUrl}
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

				{#if fields.publicationYear !== undefined}
					<div class="supplemental-inner">
						<h2>Published</h2>
						<div class="body">{fields.publicationYear}</div>
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
				{#if coverUrl}
					<div class="supplemental-inner">
						<h2>Cover</h2>
						<picture class="cover-picture">
							<source srcset={coverAvif} type="image/avif" />
							<img src={coverUrl} loading="lazy" alt="Cover of {piece.title}" />
						</picture>
					</div>
				{/if}
			</section>
		{/if}

		{#if tags.length}
			<div class="section">
				<div class="tags-container">
					{#each tags as tag (tag.slug)}
						<a href="/tags/{encodeURIComponent(tag.slug)}" class="tag">#{tag.tag?.toLowerCase()}</a>
					{/each}
				</div>
			</div>
		{/if}
	</section>
</section>

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
		max-height: 100px;
		overflow: visible;
		margin-bottom: -1.5rem; /* Overlap byline row */
		--book-transform-start: rotateY(60deg);
		--book-transform-end: none;
		--book-transform-origin: left center;
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
	}

	section.details::before {
		content: '';
		margin: auto;
		width: 100%;
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
		max-width: 350px;
		margin-inline: auto;
	}

	.cover-picture img {
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 525px;
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

	.book-cover img {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--book-width);
		height: var(--book-height);
		object-fit: cover;
	}

	@keyframes book-settle {
		from {
			transform: var(
				--book-transform-start,
				rotateY(48deg) rotateX(-9deg) rotateZ(-9deg) translateZ(var(--book-thickness))
					translateX(-48px) translateY(-20px)
			);
		}
	}

	.book {
		width: var(--book-width);
		height: var(--book-height);
		position: relative;
		color: var(--book-book-color);
		transition: var(--book-transition);
		transform-origin: var(--book-transform-origin, center);
		transform: var(
			--book-transform-end,
			var(
				--book-transform-start,
				rotateY(48deg) rotateX(-9deg) rotateZ(-9deg) translateZ(var(--book-thickness))
					translateX(-48px) translateY(-20px)
			)
		);
		box-shadow: -8px 8px 8px var(--book-shadow-color);
		transform-style: preserve-3d;
		animation: book-settle 0.75s ease;
	}

	.book-pages {
		display: var(--book-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		left: 0;
		top: var(--book-page-offset, 3px);
		width: calc(var(--book-thickness) - 10px);
		height: calc(var(--book-height) - 2 * var(--book-page-offset, 3px));
		transform: translateX(
				calc(var(--book-width) - var(--book-thickness) / 2 - var(--book-page-offset, 3px))
			)
			translateZ(calc(0px - var(--book-thickness) / 2)) rotateY(90deg);
		background: linear-gradient(
			90deg,
			var(--book-pages-color) 0%,
			#f9f9f9 5%,
			var(--book-pages-color) 10%,
			#f9f9f9 15%,
			var(--book-pages-color) 20%,
			#f9f9f9 25%,
			var(--book-pages-color) 30%,
			#f9f9f9 35%,
			var(--book-pages-color) 40%,
			#f9f9f9 45%,
			var(--book-pages-color) 50%,
			#f9f9f9 55%,
			var(--book-pages-color) 60%,
			#f9f9f9 65%,
			var(--book-pages-color) 70%,
			#f9f9f9 75%,
			var(--book-pages-color) 80%,
			#f9f9f9 85%,
			var(--book-pages-color) 90%,
			#f9f9f9 95%,
			var(--book-pages-color) 100%
		);
	}

	.book-pages-bottom {
		display: var(--book-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		left: 1px;
		bottom: 0;
		width: calc(var(--book-width) - 4px);
		height: var(--book-thickness);
		transform: translateY(calc(var(--book-thickness) / 2 - 5px))
			translateZ(calc(-1px - var(--book-thickness) / 2)) rotateX(90deg);
		background: linear-gradient(
			0deg,
			var(--book-pages-color) 0%,
			#f9f9f9 5%,
			var(--book-pages-color) 10%,
			#f9f9f9 15%,
			var(--book-pages-color) 20%,
			#f9f9f9 25%,
			var(--book-pages-color) 30%,
			#f9f9f9 35%,
			var(--book-pages-color) 40%,
			#f9f9f9 45%,
			var(--book-pages-color) 50%,
			#f9f9f9 55%,
			var(--book-pages-color) 60%,
			#f9f9f9 65%,
			var(--book-pages-color) 70%,
			#f9f9f9 75%,
			var(--book-pages-color) 80%,
			#f9f9f9 85%,
			var(--book-pages-color) 90%,
			#f9f9f9 95%,
			var(--book-pages-color) 100%
		);
	}

	.book-pages-top {
		display: var(--book-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		right: 1px;
		top: 0px;
		width: calc(var(--book-width) - 4px);
		height: var(--book-thickness);
		transform: translate3D(
				0px,
				calc(0px - (var(--book-thickness) / 2 - 5px)),
				calc(-1px - var(--book-thickness) / 2)
			)
			rotate3D(1, 0, 0, 90deg);
		background: linear-gradient(
			0deg,
			var(--book-pages-color) 0%,
			#f9f9f9 5%,
			var(--book-pages-color) 10%,
			#f9f9f9 15%,
			var(--book-pages-color) 20%,
			#f9f9f9 25%,
			var(--book-pages-color) 30%,
			#f9f9f9 35%,
			var(--book-pages-color) 40%,
			#f9f9f9 45%,
			var(--book-pages-color) 50%,
			#f9f9f9 55%,
			var(--book-pages-color) 60%,
			#f9f9f9 65%,
			var(--book-pages-color) 70%,
			#f9f9f9 75%,
			var(--book-pages-color) 80%,
			#f9f9f9 85%,
			var(--book-pages-color) 90%,
			#f9f9f9 95%,
			var(--book-pages-color) 100%
		);
	}

	.book-spine {
		align-items: center;
		color: var(--book-spine-text-color);
		display: flex;
		font-size: 1.5rem;
		justify-content: center;
		outline: solid 1px transparent;
		width: calc(var(--book-thickness));
		height: var(--book-height);
		transform: translateX(calc(0px - (var(--book-thickness) / 2)))
			translateZ(calc(0px - var(--book-thickness) / 2)) rotateY(-90deg);
		background-color: var(--book-spine-color);
	}

	.book-back {
		display: var(--book-transform-display, none);
		position: absolute;
		outline: solid 1px transparent;
		top: 0;
		left: 1px;
		width: var(--book-width);
		height: var(--book-height);
		transform: translateZ(calc(0px - var(--book-thickness)));
		background-color: var(--book-book-color);
		border-top-right-radius: var(--book-border-radius, 7px);
		border-bottom-right-radius: var(--book-border-radius, 7px);
	}

	.book-cover-front {
		width: 100%;
		position: absolute;
		outline: solid 1px transparent;
		text-align: center;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
		hyphens: auto;
		padding: 7px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: calc(3rem * var(--book-scale));
	}

	.book-cover {
		position: absolute;
		outline: solid 1px transparent;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
		background-color: var(--book-book-color);
		color: var(--book-book-text-color);
		overflow: hidden;
		border-top-right-radius: var(--book-border-radius, 7px);
		border-bottom-right-radius: var(--book-border-radius, 7px);
		display: flex;
		align-items: center;
	}

	.book-spine-text {
		transform: rotate(90deg);
		white-space: nowrap;
		width: calc(var(--book-height) - 50px);
		height: calc(var(--book-thickness) - 2px);
		font-size: calc(1.2rem * var(--book-scale));
		text-align: center;
		display: flex;
		align-items: center;
		overflow: clip;
		padding-left: 20px;
		background-color: var(--book-spine-color);
		color: var(--book-spine-text-color);
	}

	.book-spine-title {
		font-weight: 700;
		display: inline-block;
	}

	.book-spine-author {
		font-weight: 400;
		margin-right: 1em;
		display: inline-block;
	}

	.book-shadow {
		background: var(--color-shadow);
		filter: blur(15px);
		width: var(--book-width);
		height: calc(var(--book-thickness) * 3);
		transform: rotateX(90deg) rotateY(180deg) translateZ(calc(var(--book-thickness) * 3 / 2))
			translateY(calc(var(--book-thickness) * -3 / 2));
		position: absolute;
		outline: solid 1px transparent;
		bottom: 0px;
		left: 0px;
	}
</style>
