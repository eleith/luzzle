<script lang="ts">
	import { page } from '$app/state'
	import type { PageProps } from './$types'
	import ContentBanner from '#lib/content/components/ContentBanner.svelte'
	import PieceIcon from '#lib/pieces/components/icon.svelte'
	import Markdown from '#lib/content/markdown/Markdown.svelte'

	let { data }: PageProps = $props()
	const collections = $derived([
		{ title: 'latest', pieces: data.latest },
		{ title: 'random', pieces: data.random }
	])
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title="RSS feed | all"
		href={`${page.data.config.url.app}/rss/pieces/feed.xml`}
	/>
</svelte:head>

<ContentBanner showRandom showHome={false} />

<main id="main-content">
	{#if data.body === undefined}
		<section class="section">
			<h1>luzzle pieces</h1>
			<p>export all the <a href="/pieces">pieces</a></p>
			{#if data.types.length}
				<h2>types</h2>
				<div class="types-list">
					{#each data.types as type (type)}
						<a href="/pieces/{type}" class="type-link">{type}</a>
					{/each}
				</div>
			{/if}
		</section>
	{:else if data.body}
		<section class="section"><Markdown html={data.body} /></section>
	{/if}

	{#each collections as collection (collection.title)}
		{#if collection.pieces.length}
			<section class="section">
				<h2>{collection.title}</h2>
				<div class="pieces-grid">
					{#each collection.pieces as piece (piece.id)}
						<a href="/pieces/{piece.type}/{piece.slug}" class="piece">
							<div class="piece-card">
								<PieceIcon {piece} size={{ width: 80 }} />
								<span>{piece.title}</span>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{/each}
</main>

<style>
	.section {
		max-width: 800px;
		margin: auto;
		padding: var(--space-5);
	}
	h2 {
		font-size: var(--font-size-md);
		margin-bottom: var(--space-3);
	}
	.types-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.pieces-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
		gap: var(--space-4);
	}
	.piece-card {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		height: 100%;
	}
</style>
