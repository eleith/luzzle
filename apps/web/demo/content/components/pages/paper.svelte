<script lang="ts">
	const { piece, tags, helpers, components }: PiecePageProps = $props()
	const { NavBanner } = components
	const minutes = Math.floor(((piece.note?.length || 0) as number) / 5 / 250)

	const bylineParts: string[] = []
	if (minutes > 0) bylineParts.push(`${minutes} min read`)
	if (piece.date_consumed) {
		bylineParts.push(
			new Date(piece.date_consumed)
				.toLocaleDateString('en-US', { timeZone: 'UTC' })
				.replaceAll('/', '.')
		)
	}
</script>

<NavBanner showRandom />

<main id="main-content" role="main">
	<section class="hero">
		<h1>{piece.title}</h1>
		{#if bylineParts.length}
			<p class="byline">{bylineParts.join(' · ')}</p>
		{/if}
	</section>

	<section class="content">
		<section class="details">
			<div>
				{#if piece.note}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html helpers.getPieceAssetContent(piece.key, 'markdown') || piece.note}
				{:else}
					<em class="empty-note">this record does not have a note</em>
				{/if}
			</div>

			{#if tags.length}
				<div class="section">
					<div class="tags-container">
						{#each tags as tag (tag.slug)}
							<a href="/tags/{tag.slug}" class="tag">#{tag.tag?.toLowerCase()}</a>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	</section>
</main>

<style>
	section.hero {
		width: 85%;
		margin: 0 auto;
		padding: var(--space-5) var(--space-2-5) 0;
	}

	@media screen and (min-width: 768px) {
		section.hero {
			width: clamp(500px, 66.6666%, 800px);
		}
	}

	section.hero h1 {
		font-size: var(--font-size-xxl, 2rem);
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.01em;
		color: var(--color-on-surface);
		margin: 0;
	}

	section.content {
		width: 100%;
		position: relative;
	}

	section.details {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		justify-content: space-between;
		width: 85%;
		margin: 0 auto;
		padding: var(--space-5) var(--space-2-5);
		position: relative;
	}

	@media screen and (min-width: 768px) {
		section.details {
			width: clamp(500px, 66.6666%, 800px);
		}
	}

	.byline {
		font-size: var(--font-size-xs);
		color: var(--color-on-surface-variant);
		margin: var(--space-1) 0 0;
	}

	.empty-note {
		color: var(--color-on-surface-variant);
		font-style: italic;
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
