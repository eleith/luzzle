<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import PieceIcon from '$lib/pieces/components/icon.svelte'

	let activePieceId = $state<string | null>(null)
	let { data } = $props()

	afterNavigate(({ type }) => {
		if (type === 'link') {
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
	})
</script>

<h1 class="visually-hidden">
	{#if data.query}
		Search results for "{data.query}"
	{:else}
		Search
	{/if}
</h1>

{#if data.pieces.length === 0}
	<section class="action">
		<span>No results found for <em>{data.query}</em>.</span>
	</section>
{:else}
	<section class="container">
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
				<div style="display: flex; align-items: flex-start;">
					<div style="flex: 1 1 0%;">
						<div style="display: flex;">
							<div style="align-self: baseline;">
								<PieceIcon {piece} size={{ width: 125 }} active={activePieceId === piece.id} />
							</div>
						</div>
					</div>
					<div class="piece-text">
						{piece.title}
					</div>
				</div></a
			>
		{/each}
	</section>

	{#if data.nextPage}
		<section class="action">
			{#if data.nextPage && data.query !== null}
				<a href="?query={data.query}&page={data.nextPage}">more</a>
			{/if}
		</section>
	{/if}
{/if}

<style>
	.container {
		display: grid;
		width: 100%;
		margin: auto;
		padding-left: var(--space-5);
		padding-right: var(--space-5);
		padding-bottom: var(--space-5);
		grid-template-columns: 280px;
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

	.action {
		text-align: center;
		padding: var(--space-5) 0 var(--space-5) 0;
	}

	.piece-text {
		flex: 1 1 0%;
		align-self: center;
		max-height: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-left: var(--space-2);
	}
</style>
