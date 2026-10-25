<script lang="ts">
	import type { FeedData } from './types.js'

	let { data }: { data: FeedData } = $props()
	const title = $derived(
		data.feed.type === 'tag'
			? `RSS feed for tag: ${data.feed.label}`
			: `RSS feed for ${data.feed.label}`
	)
</script>

<div class="content-wrapper" id="default-feed">
	<main>
		<header>
			<h1>{title}</h1>
		</header>

		<div class="pieces-list">
			{#each data.pieces as piece (piece.id)}
				<a href="/pieces/{piece.type}/{piece.slug}" class="item-card">
					<div class="item-link">
						<span class="item-date">
							{new Date(piece.date_consumed || piece.date_added).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'short',
								day: 'numeric',
								timeZone: 'UTC'
							})}
						</span>
						<span class="item-title">{piece.title}</span>
					</div>
					{#if piece.note}
						<div class="item-note">
							{piece.note}
						</div>
					{/if}
				</a>
			{/each}
		</div>
	</main>
</div>

<style>
	.content-wrapper {
		margin: var(--space-4) auto;
		padding: 0 var(--space-4);
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: clamp(500px, 66.6666%, 1000px);
	}

	h1 {
		font-size: var(--font-size-large);
		margin-bottom: 0.5em;
	}

	.pieces-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.item-card {
		background-color: var(--color-surface-container-low);
		border-radius: var(--radius-large);
		border: 1px solid var(--color-surface-container-high);
		padding: var(--space-4);
		transition: all 0.2s ease-in-out;
		display: block;
		text-decoration: none;
	}

	.item-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-raised);
		border-color: var(--color-outline);
	}

	.item-link {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: var(--color-on-surface);
	}

	.item-title {
		font-size: 1.2em;
		font-weight: 500;
		color: var(--color-on-surface);
	}

	.item-card:hover .item-title {
		color: var(--color-primary);
	}

	.item-date {
		color: var(--color-on-surface);
		font-size: 0.7em;
		font-weight: 300;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-1);
	}

	.item-note {
		margin-top: var(--space-3);
		line-height: 1.6;
		font-size: 0.95em;
		color: var(--color-on-surface);
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		overflow: hidden;
	}
</style>
