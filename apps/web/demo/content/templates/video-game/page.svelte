<script lang="ts">
	import type { ServerPageProps } from '@luzzle/web.templates/pages/props'
	import type { Fields } from '@luzzle/web.templates/pages/video-game/schema'

	let { piece, fields, tags, helpers }: ServerPageProps<Fields> = $props()
	const palette = $derived(helpers.getPiecePalette())
	const link = $derived(helpers.safeExternalUrl(fields.url))
	const publishedYear = $derived.by(() => {
		if (fields.datePublished == null) return undefined
		const year = new Date(fields.datePublished).getUTCFullYear()
		return Number.isFinite(year) ? year : undefined
	})
	const coverUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 800, 'jpg') : undefined
	)
	const coverAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 800, 'avif') : undefined
	)
	const byline = $derived.by(() => {
		const parts: string[] = []
		if (fields.platform) parts.push(fields.platform)
		if (fields.playTimeMinutes !== undefined) {
			parts.push(`${Math.round(fields.playTimeMinutes / 60)} hrs`)
		}
		const consumed = helpers.formatPieceDate(piece.date_consumed)
		if (consumed) parts.push(consumed)
		return parts.join(' · ')
	})
	helpers.requestNavBar({
		showRandom: true,
		background: palette?.background || 'var(--color-surface-container)',
		color: palette?.bodyText,
		hoverColor: palette?.accent
	})

	const heroWidth = 250
	const heroHeight = (heroWidth * 3) / 2
	const heroScale = Math.round((heroWidth / 375) * 100) / 100
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, heroWidth, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, heroWidth, 'avif') : undefined
	)
</script>

{#snippet heroIcon()}
	<div
		class="cartridge-container"
		inert
		style="
  --game-scale: {heroScale};
  --game-width: {heroWidth}px;
	--game-height: {heroHeight}px;"
	>
		<div class="cartridge" style:transform="scale(1)">
			<div class="cartridge-top"></div>
			<div class="cartridge-header">
				<div class="cartridge-header-overlay">
					<div class="cartridge-brand">
						<span class="cartridge-brand-name">{piece.title}</span>
					</div>
				</div>
			</div>
			<div class="cartridge-body">
				<div class="cartridge-end"></div>
				<div class="cartridge-label-container">
					<div class="cartridge-gap">
						<div class="cartridge-image-container">
							{#if imageUrl}
								<picture>
									<source srcset={imageAvif} type="image/avif" />
									<img src={imageUrl} loading="eager" fetchpriority="high" alt="" />
								</picture>
							{/if}
						</div>
					</div>
					<div class="cartridge-arrow-down"></div>
				</div>
				<div class="cartridge-end"></div>
			</div>
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
			{@render heroIcon()}
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

		{#if link || fields.isbn || fields.publisher || publishedYear !== undefined || piece.summary || coverUrl}
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

				{#if fields.publisher}
					<div class="supplemental-inner">
						<h2>Publisher</h2>
						<div class="body">
							{fields.publisher}
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

	.cartridge-container {
		--game-border-radius: 7px;
		position: relative;
		width: var(--game-width);
		height: var(--game-height);
	}

	.cartridge {
		transform-origin: top center;
		width: var(--game-width);
		box-shadow: 8px 8px 8px var(--color-shadow);
		border-radius: 0 0 var(--game-border-radius) var(--game-border-radius);
	}

	.cartridge-top {
		width: calc(var(--game-width) * 0.9);
		height: calc(var(--game-width) * 1.25 * 0.02);
		background: #8c8c8c;
		border-radius: var(--game-border-radius) var(--game-border-radius) 0 0;
		box-shadow: 0px -2px 0px var(--color-shadow);
	}

	.cartridge-body {
		width: var(--game-width);
		background: #8c8c8c;
		border-radius: 0 0 var(--game-border-radius) var(--game-border-radius);
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		background-image: linear-gradient(transparent, #666);
	}

	.cartridge-label-container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cartridge-end {
		width: 5%;
		height: calc(var(--game-width) * 1.25 * 0.35);
		background: #5d5d5d;
		border-top: 3px solid #444;
	}

	.cartridge-end:first-child {
		border-radius: 0 0 0 var(--game-border-radius);
	}

	.cartridge-end:last-child {
		border-radius: 0 0 var(--game-border-radius) 0;
	}

	.cartridge-gap {
		width: calc(var(--game-width) * 0.74);
		height: calc(var(--game-width) * 0.74);
		background: #666;
		background-image: linear-gradient(#666, #555);
		border-radius: var(--game-border-radius);
		display: flex;
		justify-content: center;
		align-items: center;
		border-top: 2px solid #444;
		border-bottom: 2px solid #aaa;
		overflow: hidden;
	}

	.cartridge-arrow-down {
		border-top: 1px solid #555;
		border-left: 1px solid transparent;
		border-right: 1px solid transparent;
		border-width: calc(var(--game-width) * 0.1);
		border-radius: 10px;
		margin: 8px 0 8px 0;
		filter: drop-shadow(0 1px 0 #999) drop-shadow(0 -1px 0 #444);
	}

	.cartridge-header {
		justify-content: center;
		width: calc(var(--game-width) * 1);
		height: calc(var(--game-width) * 1.25 * 0.12);
		background: linear-gradient(#8c8c8c 0 15%, transparent 15% 75%, #8c8c8c 75%),
			linear-gradient(90deg, transparent 0 1%, #444 1% 5%, #000 50%, #444 95% 99%, transparent 99%);
		border-radius: 0 var(--game-border-radius) 0 0;
		display: flex;
		align-items: center;
		container: cartridge / inline-size;
	}

	.cartridge-header-overlay {
		width: 100%;
		height: 75%;
		display: flex;
		justify-content: center;
		align-items: center;
		background: repeating-linear-gradient(var(--game-color, #8c8c8c) 0 10%, transparent 10% 20%);
	}

	.cartridge-brand {
		width: 78%;
		height: 100%;
		background: linear-gradient(#444 5%, #707070 85%);
		box-shadow:
			0 5px 15px 10px #4448 inset,
			0 -1px 0 1px #ddd inset,
			0 1px 2px 2px #222 inset;
		border: clamp(0px, 5%, 5px) solid var(--game-color, #8c8c8c);
		border-radius: 75px;
		transform: translate(0, 3%);
		display: flex;
		justify-content: center;
		align-items: center;
		color: #fff;
		text-shadow: 1px 2px 1px #0005;
		overflow: hidden;
		text-overflow: ellipsis;
		text-wrap: nowrap;
	}

	.cartridge-brand-name {
		font-size: calc(1rem * var(--game-scale));
		letter-spacing: 0px;
		display: inline-block;
		padding-left: calc(7px * var(--game-scale));
		padding-right: calc(7px * var(--game-scale));
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.cartridge-image-container img {
		width: calc(var(--game-width) * 0.67);
		height: calc(var(--game-width) * 0.67);
		object-fit: cover;
		border-radius: var(--game-border-radius);
		object-position: top;
	}
</style>
