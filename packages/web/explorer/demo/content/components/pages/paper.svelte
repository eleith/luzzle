<script lang="ts">
	import { type PiecePageProps } from '$lib/pieces/helpers'
	const { piece, tags, html_note }: PiecePageProps = $props()
</script>

<section class="content">
	<section class="details">
		{#if piece.date_consumed}
			<div class="date">
				{new Date(piece.date_consumed).toLocaleDateString(undefined, { timeZone: 'UTC' })}
			</div>
		{/if}

		<div>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html html_note}
		</div>
	</section>

	{#if tags.length}
		<section class="tags-container">
			{#each tags as tag (tag.slug)}
				<a href="/tags/{tag.slug}" class="tag">#{tag.tag}</a>
			{/each}
		</section>
	{/if}
</section>

<style>
	section.content {
		width: 100%;
		position: relative;
	}

	section.details {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		justify-content: space-between;
		max-width: 65ch;
		width: 100%;
		margin: 0 auto;
		padding: 0 var(--space-2-5) var(--space-5);
		position: relative;
	}

	@media screen and (min-width: 768px) {
		section.details {
			padding: 0 0 var(--space-5);
		}
	}

	section.details .date {
		font-size: var(--font-size-xxs);
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		font-size: var(--font-size-xxs);
		justify-content: center;
		padding: var(--space-4);
		border-top: solid 1px var(--color-surface-container-low);
		margin: auto;
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
