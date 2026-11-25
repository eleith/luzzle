<script lang="ts">
	import type { ServerPageProps } from '@luzzle/web.templates/pages/props'
	import type { Fields } from '@luzzle/web.templates/pages/article/schema'

	let { piece, fields, tags, helpers }: ServerPageProps<Fields> = $props()
	const palette = $derived(helpers.getPiecePalette())
	const link = $derived(helpers.safeExternalUrl(fields.url))
	const publishedYear = $derived.by(() => {
		if (fields.datePublished == null) return undefined
		const year = new Date(fields.datePublished).getUTCFullYear()
		return Number.isFinite(year) ? year : undefined
	})
	const isActive = $derived(fields.isActive ?? true)
	const isPaywalled = $derived(fields.isPaywalled ?? false)
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 800, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 800, 'avif') : undefined
	)
	const iconWidth = 250
	const iconHeight = (iconWidth * 3) / 2
	const iconScale = Math.round((iconWidth / 375) * 100) / 100
	const displayUrl = $derived(fields.url || helpers.getPieceUrl())
	const iconImageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, iconWidth, 'jpg') : undefined
	)
	const iconImageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, iconWidth, 'avif') : undefined
	)
	const renderedNote = $derived(helpers.getPieceAssetContent(piece.key, 'markdown'))
	const byline = $derived.by(() => {
		const parts: string[] = []
		if (fields.author) parts.push(`by ${fields.author}`)
		else if (link && (link.startsWith('http:') || link.startsWith('https:'))) {
			const hostname = new URL(link).hostname.replace(/^www\./, '').replace(/\.com$/, '')
			if (hostname && hostname.length <= 25) parts.push(hostname)
		}
		if (fields.wordCount && Number.isFinite(fields.wordCount) && fields.wordCount > 0) {
			parts.push(`${Math.max(1, Math.round(fields.wordCount / 250))} min`)
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
</script>

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
			<div
				class="browser-container"
				inert
				style="
				  --piece-icon-scale: {iconScale};
				  --piece-icon-width: {iconWidth}px;
					--piece-icon-height: {iconHeight}px;"
			>
				<div class="browser-mockup">
					<div class="browser-window-bar">
						<div class="browser-controls">
							<div class="browser-control-dot red"></div>
							<div class="browser-control-dot yellow"></div>
							<div class="browser-control-dot green"></div>
						</div>
					</div>
					<div class="browser-url-bar">
						<div class="browser-nav-buttons">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="32"
								height="32"
								fill="currentColor"
								viewBox="0 0 256 256"
								><path
									d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"
								></path></svg
							>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="32"
								height="32"
								fill="currentColor"
								viewBox="0 0 256 256"
								><path
									d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"
								></path></svg
							>
						</div>
						<div class="browser-address-input">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="32"
								height="32"
								fill="currentColor"
								viewBox="0 0 256 256"
								><path
									d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0Z"
								></path></svg
							>
							<div class="browser-address-url">
								{displayUrl}
							</div>
						</div>
					</div>
					<div class="browser-content-area">
						<div class="browser-content-inner">
							{#if iconImageUrl}
								<picture>
									<source srcset={iconImageAvif} type="image/avif" />
									<img
										src={iconImageUrl}
										loading="eager"
										fetchpriority="high"
										alt="webpage banner"
									/>
								</picture>
							{/if}
							<h1>
								{piece.title}
							</h1>
							<p>
								{piece.summary}
							</p>
						</div>
					</div>
				</div>
			</div>
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
				{#if renderedNote}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html renderedNote}
				{:else if piece.note}
					{piece.note}
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
	.browser-container {
		width: var(--piece-icon-width);
	}

	.browser-mockup {
		background-color: #e5e7eb;
		border-radius: calc(0.75rem * var(--piece-icon-scale));
		box-shadow: 2.6px 5.3px 5.3px var(--color-shadow);
		max-height: var(--piece-icon-height);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.browser-window-bar {
		height: calc(30px * var(--piece-icon-scale));
		background-color: #f3f4f6;
		display: flex;
		align-items: center;
		padding: 0 calc(10px * var(--piece-icon-scale));
		border-bottom: 1px solid #d1d5db;
		justify-content: flex-end;
		flex-shrink: 0;
	}

	.browser-controls {
		display: flex;
		gap: calc(5px * var(--piece-icon-scale));
	}

	.browser-control-dot {
		width: calc(0.675rem * var(--piece-icon-scale));
		height: calc(0.675rem * var(--piece-icon-scale));
		border-radius: 9999px;
		border: 1px solid;
	}

	.browser-control-dot.red {
		background-color: #ef4444;
		border-color: #dc2626;
	}

	.browser-control-dot.yellow {
		background-color: #f59e0b;
		border-color: #d97706;
	}

	.browser-control-dot.green {
		background-color: #22c55e;
		border-color: #16a34a;
	}

	.browser-url-bar {
		background-color: #f3f4f6;
		display: flex;
		flex-direction: row-reverse;
		align-items: center;
		padding: calc(10px * var(--piece-icon-scale)) calc(10px * var(--piece-icon-scale));
		border-bottom: 1px solid #d1d5db;
		gap: calc(5px * var(--piece-icon-scale));
		flex-shrink: 0;
	}

	.browser-nav-buttons {
		display: flex;
		gap: calc(5px * var(--piece-icon-scale));
		color: #6b7280;
	}

	.browser-nav-buttons svg {
		width: calc(20px * var(--piece-icon-scale));
		height: calc(20px * var(--piece-icon-scale));
		flex-shrink: 0;
	}

	.browser-address-input {
		flex-grow: 1;
		background-color: #ffffff;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		padding: 0 calc(5px * var(--piece-icon-scale));
		height: calc(30px * var(--piece-icon-scale));
		border-top: 1px solid #d1d5db;
		border-bottom: 1px solid #d1d5db;
		overflow: hidden;
		flex: 80%;
	}

	.browser-address-input svg {
		width: calc(18px * var(--piece-icon-scale));
		height: calc(18px * var(--piece-icon-scale));
		color: #22c55e;
		margin-right: calc(5px * var(--piece-icon-scale));
		flex-shrink: 0;
	}

	.browser-address-url {
		color: #6b7280;
		font-size: calc(0.75rem * var(--piece-icon-scale));
		line-height: calc(1.25rem * var(--piece-icon-scale));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.browser-content-area {
		background-color: #ffffff;
		overflow: hidden;
		position: relative;
	}

	.browser-content-area::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: calc(40px * var(--piece-icon-scale));
		background: linear-gradient(transparent, #ffffff);
		pointer-events: none;
	}

	.browser-content-inner {
		margin: auto;
	}

	.browser-content-inner picture {
		width: 100%;
		height: calc(var(--piece-icon-width) / 3);
		border-radius: 0.5rem;
		margin-bottom: calc(10px * var(--piece-icon-scale));
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f0f0f0;
	}

	.browser-content-inner picture img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
	}

	.browser-content-inner h1 {
		font-size: calc(1.25rem * var(--piece-icon-scale));
		font-weight: 700;
		color: #111827;
		margin: calc(10px * var(--piece-icon-scale)) calc(14px * var(--piece-icon-scale));
		text-align: center;
		display: inline-block;
	}

	.browser-content-inner p {
		color: #4b5563;
		line-height: calc(1.35rem * var(--piece-icon-scale));
		margin: calc(10px * var(--piece-icon-scale)) calc(14px * var(--piece-icon-scale));
		padding-top: 0;
		text-align: left;
		font-size: calc(0.75rem * var(--piece-icon-scale));
		display: inline-block;
	}
</style>
