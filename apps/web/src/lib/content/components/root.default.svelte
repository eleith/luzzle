<script lang="ts">
	import type { RootPageProps } from '$lib/content/types.js'

	let { types, pieces, components }: RootPageProps = $props()
	const { ContentBanner, PieceIcon } = components
</script>

<ContentBanner showRandom={true} showHome={false} />

<main id="main-content">
	<section class="section">
		<div>
			<h1>luzzle pieces</h1>
			<p>export all the <a href="/pieces">pieces</a></p>
		</div>
	</section>

	{#if types.length}
		<section class="section">
			<h2>types</h2>
			<div class="types-list">
				{#each types as type, index (index)}
					<a href="/pieces/{type}" class="type-link">{type}</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if pieces.length}
		<section class="section">
			<h2>latest</h2>
			<div class="pieces-grid">
				{#each pieces as piece (piece.id)}
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
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-4);
	}

	.piece-card {
		display: flex;
		align-items: top;
		gap: var(--space-3);
		height: 100%;
	}
</style>
