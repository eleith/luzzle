<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'

	let activePieceId = $state<string | null>(null)
	let { data } = $props()

	function actionPiece(node: HTMLAnchorElement, focus: boolean) {
		if (focus) {
			node.focus()
		}
	}

	afterNavigate(({ type }) => {
		if (type === 'link') {
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
	})
</script>

{#if data.pieces.length === 0}
	<section class="action">
		<span>No results found for <em>{data.query}</em>.</span>
	</section>
{:else}
	<section class="container">
		{#each data.pieces as piece (piece.id)}
			<a
				use:actionPiece={data.pieces[0].id === piece.id}
				href="/pieces/{piece.type}/{piece.slug}"
				onmouseenter={() => {
					activePieceId = piece.id
				}}
				onmouseleave={() => {
					if (activePieceId) {
						activePieceId = null
					}
				}}
				onfocus={() => {
					activePieceId = piece.id
				}}
				onblur={() => {
					if (activePieceId) {
						activePieceId = null
					}
				}}
				ontouchstart={() => {
					activePieceId = piece.id
				}}
				ontouchend={() => {
					if (activePieceId) {
						activePieceId = null
					}
				}}
			>
				<div style="display: flex; align-items: flex-start;">
					<div style="flex: 1 1 0%;">
						<div style="display: flex;">
							<div style="align-self: baseline;">
								{#key activePieceId === piece.id}
									<PieceIcon {piece} size="s" active={activePieceId === piece.id} />
								{/key}
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
		color: var(--colors-on-surface);
		cursor: pointer;
		text-decoration: none;
		min-height: 200px;
	}

	.container > a:hover {
		text-decoration: underline;
		color: var(--colors-primary);
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
