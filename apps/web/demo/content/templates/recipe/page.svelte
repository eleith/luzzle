<script lang="ts">
	import type { ServerPageProps } from '@luzzle/web.templates/pages/props'
	import type { Fields } from '@luzzle/web.templates/pages/recipe/schema'

	let { piece, fields, tags, helpers }: ServerPageProps<Fields> = $props()
	const ingredientScope = $props.id()
	const palette = $derived(helpers.getPiecePalette())
	helpers.requestNavBar({
		showRandom: true,
		background: palette?.background || 'var(--color-surface-container)',
		color: palette?.bodyText,
		hoverColor: palette?.accent
	})
	const ingredients = $derived(fields.ingredients ?? [])
	const instructions = $derived(fields.instructions ?? [])
	function getTotalMinutes(value: Fields): number | undefined {
		if (value.totalMinutes !== undefined) return value.totalMinutes
		if (value.prepMinutes === undefined && value.cookMinutes === undefined) return undefined
		return (value.prepMinutes ?? 0) + (value.cookMinutes ?? 0)
	}
	const totalTime = $derived(getTotalMinutes(fields))
	const link = $derived(helpers.safeExternalUrl(fields.url))
	const imageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 800, 'jpg') : undefined
	)
	const imageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 800, 'avif') : undefined
	)
	const updated = $derived(helpers.formatPieceDate(fields.dateUpdated))
	const byline = $derived.by(() => {
		const parts: string[] = []
		if (ingredients.length) parts.push(`${ingredients.length} ingredients`)
		if (totalTime !== undefined) parts.push(`${totalTime}m`)
		const consumed = helpers.formatPieceDate(piece.date_consumed)
		if (consumed) parts.push(consumed)
		return parts.join(' · ')
	})
	const heroImageUrl = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 150, 'jpg') : undefined
	)
	const heroImageAvif = $derived(
		fields.image ? helpers.getPieceImageUrl(fields.image, 150, 'avif') : undefined
	)
</script>

{#snippet heroCard()}
	<div
		class="recipe-card"
		inert
		style="
			--card-scale: 0.4;
			--card-width: 150px;
			--card-max-height: 225px;"
	>
		{#if heroImageUrl}
			<picture class="card-image">
				{#if heroImageAvif}
					<source srcset={heroImageAvif} type="image/avif" />
				{/if}
				<img src={heroImageUrl} loading="eager" fetchpriority="high" alt="" />
			</picture>
		{/if}
		<div class="card-body">
			<div class="card-title">{piece.title}</div>
			{#if ingredients.length}
				<div class="ingredient-preview">
					{#each ingredients.slice(0, 3) as ingredient}
						<div class="card-line">
							<span class="card-checkbox"></span>
							<span class="ingredient-text">{ingredient.item}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<div
			class="card-cutouts"
			style="height: 11px; clip-path: path(evenodd, 'M0,0 H150 V6 A5,5 0 0,1 145,11 H5 A5,5 0 0,1 0,6 Z M36.5,11 V8 A4,4 0 1,1 39.5,8 V11 Z M73.5,11 V8 A4,4 0 1,1 76.5,8 V11 Z M111.5,11 V8 A4,4 0 1,1 114.5,8 V11 Z');"
		></div>
	</div>
{/snippet}

<section
	class="hero"
	style="--hero-bg: {palette?.background || '#827717'}; --hero-title: {palette?.titleText ||
		'#ffffff'}"
>
	<div class="hero-inner">
		<div class="hero-text">
			<h1>{piece.title}</h1>
		</div>
		<div class="hero-icon">
			{@render heroCard()}
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

<section class="content" style="--byline-border: {palette?.accent || '#78909c'};">
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

		{#if ingredients.length}
			<section>
				<h2>Ingredients</h2>
				{#key piece.key}
					<ul
						class="ingredients-list"
						style="--checkbox-accent: {palette?.background || '#827717'}"
					>
						{#each ingredients as ingredient, i}
							<li>
								<input type="checkbox" id="{ingredientScope}-ingredient-{i}" class="checkbox" />
								<label for="{ingredientScope}-ingredient-{i}">
									{#if ingredient.quantity !== undefined}{ingredient.quantity}{/if}
									{#if ingredient.unit}
										{ingredient.unit}{/if}
									{ingredient.item}
									{#if ingredient.note}
										<span class="ingredient-note">{ingredient.note}</span>
									{/if}
								</label>
							</li>
						{/each}
					</ul>
				{/key}
			</section>
		{/if}

		{#if instructions.length || link || imageUrl || fields.prepMinutes !== undefined || fields.cookMinutes !== undefined}
			<section class="supplemental">
				{#if fields.prepMinutes !== undefined}
					<div class="supplemental-inner">
						<h2>Prep Time</h2>
						<div class="body">
							{fields.prepMinutes}m
						</div>
					</div>
				{/if}

				{#if fields.cookMinutes !== undefined}
					<div class="supplemental-inner">
						<h2>Cook Time</h2>
						<div class="body">
							{fields.cookMinutes}m
						</div>
					</div>
				{/if}

				{#if instructions.length}
					<div class="supplemental-inner">
						<h2>Instructions</h2>
						<ol class="instructions-list">
							{#each instructions as step, i}
								<li>
									<strong>Step {i + 1}</strong>
									{#if typeof step === 'string'}
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html step}
									{:else if 'html' in step}
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html step.html}
									{:else}
										{step.text}
									{/if}
								</li>
							{/each}
						</ol>
					</div>
				{/if}

				{#if imageUrl}
					<div class="supplemental-inner">
						<h2>Photo</h2>
						<picture
							class="cover-picture"
							style="--cover-accent: {palette?.accent || 'var(--color-outline-variant)'}"
						>
							<source srcset={imageAvif} type="image/avif" />
							<img src={imageUrl} loading="lazy" alt="" />
						</picture>
					</div>
				{/if}

				{#if link}
					<div class="supplemental-inner">
						<h2>Source</h2>
						<div class="body">
							<a class="article-link" href={link}>{link}</a>
						</div>
					</div>
				{/if}
			</section>
		{/if}

		{#if updated}
			<div class="info">
				last updated: {updated}
			</div>
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

	.ingredients-list {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.ingredients-list li {
		font-size: var(--font-size-small, 0.95rem);
		padding: var(--space-1) 0;
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.checkbox {
		width: 14px;
		height: 14px;
		accent-color: var(--checkbox-accent, var(--color-primary));
		flex-shrink: 0;
		margin-top: 0.4em;
		cursor: pointer;
	}

	.ingredients-list label {
		cursor: pointer;
	}

	.checkbox:checked + label {
		text-decoration: line-through;
		opacity: 0.5;
	}

	.ingredient-note {
		display: block;
		color: var(--color-on-surface-variant);
		font-style: italic;
		font-size: var(--font-size-xxs);
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
		width: 100%;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: 4px 8px 20px var(--color-shadow);
	}

	.cover-picture img {
		width: 100%;
		height: auto;
		display: block;
	}

	.instructions-list {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.instructions-list li {
		font-size: var(--font-size-small, 0.95rem);
		line-height: 1.7;
	}

	.instructions-list li strong {
		display: block;
		margin-bottom: var(--space-1);
	}

	.article-link {
		font-size: var(--font-size-xs);
		word-break: break-all;
	}

	.info {
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
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

	.recipe-card {
		--card-paper: #f4ead3;
		--card-ink: #45423b;
		--card-radius: max(4px, calc(12px * var(--card-scale)));
		--card-inset: max(6px, calc(14px * var(--card-scale)));

		width: var(--card-width);
		max-height: var(--card-max-height);
		display: flex;
		flex-direction: column;
		filter: drop-shadow(2px 4px 3px rgb(0 0 0 / 28%));
		border-radius: var(--card-radius) var(--card-radius) 0 0;
		overflow: hidden;
	}

	.card-image {
		display: block;
		height: calc(var(--card-width) * 0.64);
		min-height: 0;
	}

	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.card-body {
		background: var(--card-paper);
		flex-shrink: 0;
		padding: var(--card-inset) var(--card-inset) 0;
		overflow: hidden;
		font-size: max(9px, calc(16px * var(--card-scale)));
		line-height: 1.6;
		color: var(--card-ink);
	}

	.card-title {
		font-weight: 700;
	}

	.card-cutouts {
		background: var(--card-paper);
		flex-shrink: 0;
	}

	.ingredient-preview {
		margin-top: var(--card-inset);
	}

	.card-line {
		display: flex;
		align-items: center;
		gap: max(4px, calc(8px * var(--card-scale)));
	}

	.card-checkbox {
		width: max(5px, calc(10px * var(--card-scale)));
		height: max(5px, calc(10px * var(--card-scale)));
		border: max(1px, calc(1.5px * var(--card-scale))) solid currentColor;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.card-title,
	.ingredient-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
