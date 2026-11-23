<script lang="ts">
	import { page } from '$app/state'
	import { resolve } from '$app/paths'
	import type { PageProps } from './$types'
	import ContentBanner from '#lib/content/components/ContentBanner.svelte'
	import IconFragment from '#lib/pieces/components/IconFragment.svelte'
	import IconStylesheets from '#lib/pieces/components/IconStylesheets.svelte'
	import ClientListingIcon from '#lib/pieces/components/ClientListingIcon.svelte'
	import Markdown from '#lib/content/markdown/Markdown.svelte'

	let { data }: PageProps = $props()
	let hoveredPieceId = $state<string | null>(null)
	let focusedPieceId = $state<string | null>(null)
	const collections = $derived([
		{ title: 'latest', rows: data.latest },
		{ title: 'random', rows: data.random }
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

{#if data.iconStylesheets.length}
	<IconStylesheets stylesheets={data.iconStylesheets} />
{/if}

<div class:centered-content={data.centerContent}>
	<ContentBanner showRandom showHome={false} />

	<main id="main-content">
		{#if data.body === undefined}
			<section class="section">
				<h1>luzzle pieces</h1>
				<p>export all the <a href={resolve('pieces')}>pieces</a></p>
				{#if data.types.length}
					<h2>types</h2>
					<div class="types-list">
						{#each data.types as type (type)}
							<a href={resolve(`pieces/${type}`)} class="type-link">{type}</a>
						{/each}
					</div>
				{/if}
			</section>
		{:else if data.body}
			<section class="section"><Markdown html={data.body} /></section>
		{/if}

		{#each collections as collection (collection.title)}
			{#if collection.rows.length}
				<section class="section">
					<h2>{collection.title}</h2>
					<div class="pieces-grid">
						{#each collection.rows as { piece, iconHtml } (piece.id)}
							{@const active = hoveredPieceId === piece.id || focusedPieceId === piece.id}
							<div class="piece-card">
								<div class="piece-icon" inert aria-hidden="true">
									{#if iconHtml != null}
										<IconFragment markup={iconHtml} {active} />
									{:else}
										<ClientListingIcon {piece} size={{ width: 80 }} lazy={false} {active} />
									{/if}
								</div>
								<a
									class="piece"
									href={resolve(`pieces/${piece.type}/${piece.slug}`)}
									onpointerenter={() => (hoveredPieceId = piece.id)}
									onpointerleave={() => (hoveredPieceId = null)}
									onfocus={(e) => {
										if (e.currentTarget.matches(':focus-visible')) focusedPieceId = piece.id
									}}
									onblur={() => (focusedPieceId = null)}>{piece.title}</a
								>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</main>
</div>

<style>
	.centered-content {
		min-height: 100svh;
		display: flex;
		flex-direction: column;
	}

	.centered-content main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.centered-content .section {
		width: 100%;
	}

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
		position: relative;
		isolation: isolate;
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		min-height: 120px;
		height: 100%;
	}
	.piece::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
	}
	.piece-icon {
		isolation: isolate;
		flex: 0 0 80px;
	}
</style>
