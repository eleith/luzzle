<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import PieceIcon from '$lib/pieces/components/icon.svelte'

	let activePieceId = $state<string | null>(null)
	let { data } = $props()

	let hasSearchTerms = $derived(!!(data.query || data.type || data.after || data.before))

	afterNavigate(({ type }) => {
		if (type === 'link') {
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
	})
</script>

<section>
	<div class="container">
		<div class="search-header">
			<h1>
				{#if !hasSearchTerms}
					All pieces
				{:else if data.pieces.length === 0}
					No results found
				{:else}
					Search results
				{/if}
			</h1>
			{#if hasSearchTerms}
				<div class="search-summary">
					{#if data.query}
						for <span class="summary-highlight">"{data.query}"</span>
					{/if}
					{#if data.type}
						in <span class="summary-highlight">{data.type}</span>
					{/if}
					{#if data.after && data.before}
						between <span class="summary-highlight">{data.after}</span> and
						<span class="summary-highlight">{data.before}</span>
					{:else}
						{#if data.after}
							after <span class="summary-highlight">{data.after}</span>
						{/if}
						{#if data.before}
							before <span class="summary-highlight">{data.before}</span>
						{/if}
					{/if}
				</div>
			{/if}
		</div>

		{#if data.pieces.length > 0}
			{#each data.pieces as piece (piece.id)}
				<a
					href="/pieces/{piece.type}/{piece.slug}"
					onpointerenter={() => {
						activePieceId = piece.id
					}}
					onpointerleave={() => {
						activePieceId = null
					}}
					onfocus={(e) => {
						if (e.currentTarget.matches(':focus-visible')) {
							activePieceId = piece.id
						}
					}}
					onblur={() => {
						activePieceId = null
					}}
				>
					<div class="piece-card">
						<div class="piece-icon">
							<div style="display: flex;">
								<div style="align-self: baseline;">
									<PieceIcon {piece} size={{ width: 125 }} active={activePieceId === piece.id} />
								</div>
							</div>
						</div>
						<div class="piece-text">
							{piece.title}
						</div>
					</div>
				</a>
			{/each}
		{/if}
	</div>
</section>

{#if data.nextPage}
	<section class="action">
		<a
			href="?{new URLSearchParams({
				...(data.query && { query: data.query }),
				...(data.type && { type: data.type }),
				...(data.after && { after: data.after }),
				...(data.before && { before: data.before }),
				page: data.nextPage.toString()
			}).toString()}"
		>
			more
		</a>
	</section>
{/if}

<style>
	.search-header {
		grid-column: 1 / -1;
		padding-top: var(--space-1);
		margin-bottom: var(--space-4);
		text-align: left;
	}

	.search-header h1 {
		margin: 0;
		font-size: var(--font-size-large);
	}

	.search-summary {
		font-size: var(--font-size-small);
		color: var(--color-on-surface-variant);
		margin: 0;
	}

	.summary-highlight {
		color: var(--color-primary);
		font-weight: var(--font-weight-medium);
	}

	.container {
		display: grid;
		margin: auto;
		padding-bottom: var(--space-5);
		padding-left: var(--space-5);
		padding-right: var(--space-5);
		grid-template-columns: repeat(auto-fill, 280px);
		gap: var(--space-5);
		justify-content: space-around;
	}

	.container:last-child {
		margin-right: auto;
	}

	.container > a {
		cursor: pointer;
		text-decoration: none;
		min-height: 200px;
	}

	.container > a .piece-text {
		color: var(--color-on-surface);
	}

	.container > a:hover .piece-text,
	.container > a:focus-visible .piece-text {
		text-decoration: underline;
		color: var(--color-primary);
	}

	.container > a:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 4px;
		border-radius: 4px;
	}

	.piece-card {
		display: flex;
		align-items: flex-start;
		height: 100%;
	}

	.piece-icon {
		flex: 1 1 0%;
		align-self: center;
	}

	.piece-text {
		flex: 1 1 0%;
		align-self: center;
		max-height: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-left: var(--space-2);
	}

	.action {
		text-align: center;
		padding: var(--space-5) 0 var(--space-5) 0;
	}
</style>
