<script lang="ts">
	import { type PiecePageProps } from '$lib/pieces/helpers'
	import Icon from '$lib/pieces/components/icon.svelte'

	const { piece, tags }: PiecePageProps = $props()
	const noteHtml = piece.assets.find((a) => a.transformation === 'markdown')?.content
</script>

<section class="header">
	<Icon {piece} size={{ width: 125 }} lazy={false} />
</section>

<section class="content">
	<section class="details">
		<div class="info">
			<div>
				{#if piece.date_consumed}
					read on {new Date(piece.date_consumed).toLocaleDateString(undefined, { timeZone: 'UTC' })}
				{/if}
			</div>
			<div>
				{#if piece.metadata.pages}
					{piece.metadata.pages} pages
				{/if}
			</div>
		</div>

		<h1>
			{piece.title}
		</h1>
		<div class="info">
			<div>
				{#if piece.metadata.author}
					by {piece.metadata.author}
				{/if}
				{#if piece.metadata.year_first_published}
					in {piece.metadata.year_first_published}
				{/if}
			</div>
		</div>

		{#if noteHtml}
			<h2>Note</h2>
			<div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html noteHtml}
			</div>
		{/if}

		{#if piece.metadata.url || piece.metadata.isbn}
			<h2>Link</h2>
			<div>
				{#if piece.metadata.url}
					<a class="article-link" href={piece.metadata.url as string}>{piece.metadata.url}</a>
				{:else if piece.metadata.isbn}
					<a class="article-link" href="https://openlibrary.org/search?isbn={piece.metadata.isbn}"
						>isbn
						{piece.metadata.isbn}</a
					>
				{/if}
			</div>
		{/if}

		{#if piece.summary}
			<h2>Description</h2>
			<div>
				{piece.summary}
			</div>
		{/if}

		{#if tags.length}
			<h2>Tags</h2>
			<div class="tags-container">
				{#each tags as tag (tag.slug)}
					<a href="/tags/{tag.slug}" class="tag">{tag.tag}</a>
				{/each}
			</div>
		{/if}
	</section>
</section>

<style>
	section.content {
		width: 100%;
		position: relative;
	}

	section.details {
		display: flex;
		flex-direction: column;
		margin: auto;
		gap: var(--space-5);
		justify-content: space-between;
		width: 85%;
		padding-right: var(--space-2-5);
		padding-left: var(--space-2-5);
		padding-bottom: var(--space-5);
	}

	section.details::before {
		content: '';
		border-top: solid 3px var(--color-surface-container-highest);
		margin: auto;
		width: 100%;
	}

	@media screen and (min-width: 768px) {
		section.details {
			width: clamp(500px, 66.6666%, 800px);
		}
	}

	section.header {
		display: flex;
		align-items: center;
		justify-content: space-around;
		position: relative;
		width: auto;
		padding-top: 0px;
		padding-bottom: var(--space-5);
	}

	section.details h1 {
		font-size: var(--font-size-xl);
	}

	section.details h2 {
		font-size: var(--font-size-large);
	}

	section.details .info {
		font-size: var(--font-size-xxs);
		color: var(--color-on-surface-variant);
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: calc(var(--space-3) * -1);
	}

	.article-link {
		font-size: var(--font-size-xs);
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
