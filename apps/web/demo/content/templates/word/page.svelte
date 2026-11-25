<script lang="ts">
	import type { ServerPageProps } from '@luzzle/web.templates/pages/props'
	import type { Fields } from '@luzzle/web.templates/pages/note/schema'

	let { piece, tags, helpers }: ServerPageProps<Fields> = $props()
	const renderedNote = $derived(helpers.getPieceAssetContent(piece.key, 'markdown'))
	const byline = $derived.by(() => {
		const parts: string[] = []
		const minutes = Math.floor((piece.note?.length || 0) / 5 / 250)
		if (minutes > 0) parts.push(`${minutes} min read`)
		const consumed = helpers.formatPieceDate(piece.date_consumed)
		if (consumed) parts.push(consumed)
		return parts.join(' · ')
	})
	helpers.requestNavBar({ showRandom: true })
</script>

<div class="note-page">
	<section class="hero">
		<h1>{piece.title}</h1>
		{#if byline}
			<p class="byline">{byline}</p>
		{/if}
	</section>

	<section class="content">
		<section class="details">
			<div>
				{#if renderedNote}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html renderedNote}
				{:else if piece.note}
					{piece.note}
				{:else}
					<em class="empty-note">this record does not have a note</em>
				{/if}
			</div>

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
</div>

<style>
	.note-page {
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
		padding-inline: clamp(20px, 4vw, 24px);
	}

	section.hero {
		padding-top: var(--space-5);
	}

	section.hero h1 {
		font-size: 2em;
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
		padding-block: var(--space-5);
		position: relative;
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
