<script lang="ts">
	import { type PiecePageProps } from '$lib/pieces/helpers'
	import Icon from '$lib/pieces/components/icon.svelte'

	const { piece, tags, metadata, html_note, helpers }: PiecePageProps = $props()
</script>

{#if metadata.poster || metadata.backdrop}
	<section class="header">
		{#if metadata.backdrop}
			<picture>
				<source
					srcset={helpers.getPieceImageUrl(metadata.backdrop as string, 100, 'avif')}
					type="image/avif"
				/>
				<img
					class="backdrop-full"
					src={helpers.getPieceImageUrl(metadata.backdrop as string, 100, 'jpg')}
					loading="eager"
					alt=""
				/>
			</picture>
		{/if}
		<div class="media">
			{#if metadata.backdrop}
				<picture>
					<source
						srcset={helpers.getPieceImageUrl(metadata.backdrop as string, 500, 'avif')}
						type="image/avif"
					/>
					<img
						class="backdrop"
						src={helpers.getPieceImageUrl(metadata.backdrop as string, 500, 'jpg')}
						loading="eager"
						alt=""
					/>
				</picture>
			{/if}
			{#if metadata.poster}
				<Icon {piece} size={{ width: 250 }} lazy={false} />
			{/if}
		</div>
	</section>
{/if}

<section class="content">
	<section class="details">
		<h1>
			{piece.title}
		</h1>
		<div class="info">
			<div>
				{#if piece.date_consumed}
					viewed on {new Date(piece.date_consumed).toLocaleDateString(undefined, {
						timeZone: 'UTC'
					})}
				{/if}
			</div>
			<div>
				{#if metadata.type}
					{metadata.type},
				{/if}

				{#if metadata.date_released}
					released in {new Date(metadata.date_released as string).getUTCFullYear()}
				{/if}
			</div>
			<div>
				{#if metadata.runtime}
					{metadata.runtime} min
				{/if}
			</div>
		</div>

		{#if piece.note}
			<h2>Note</h2>
			<div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html html_note}
			</div>
		{/if}

		{#if metadata.url || metadata.isbn}
			<h2>Link</h2>
			<div>
				{#if metadata.url}
					<a class="article-link" href={metadata.url as string}>{metadata.url}</a>
				{:else if metadata.isbn}
					<a class="article-link" href="https://openlibrary.org/search?isbn={metadata.isbn}"
						>isbn
						{metadata.isbn}</a
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

		{#if metadata.people}
			<h2>People</h2>
			<div class="people">
				{metadata.people.join(', ')}
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

	section.header {
		display: flex;
		justify-content: center;
		position: relative;
		height: 250px;
		margin: auto;
		width: 100%;
		overflow: hidden;
	}

	section.header .media {
		position: relative;
		width: 100%;
		padding-top: 30px;
		padding-right: 30px;
		display: flex;
		justify-content: end;
	}

	@media screen and (min-width: 768px) {
		section.details {
			width: clamp(500px, 66.6666%, 800px);
		}
		section.header .media {
			width: clamp(500px, 100%, 800px);
		}
	}

	.backdrop {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
		filter: brightness(0.6);
	}

	.backdrop-full {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
		filter: brightness(0.3);
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
		flex-direction: column;
		margin-top: calc(var(--space-3) * -1);
	}

	.article-link {
		font-size: var(--font-size-xs);
	}

	.people {
		font-size: var(--font-size-xxs);
		overflow: hidden;
		line-clamp: 3;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		line-height: 2;
		text-overflow: clip;
		display: -webkit-box;
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
