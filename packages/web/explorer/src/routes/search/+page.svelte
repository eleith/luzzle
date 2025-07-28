<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'
	import CaretRightIcon from 'virtual:icons/ph/caret-right-thin'

	let activePieceId = $state<string | null>(null)
	let { data } = $props()
	let nextPage = $state<number | null>(2)
	let pieces = $derived(data.pieces);
	let query = $derived(data.query);

	async function getNextPage(page: number) {
		const params = new URLSearchParams()

		params.append('page', page.toString())
		params.append('query', query || '')

		const res = await fetch(`/api/search?${params}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		})

		if (res.ok) {
			const json = (await res.json()) as Omit<typeof data, 'type'>
			pieces = pieces.concat(json.pieces)
			nextPage = page + 1
		} else {
			nextPage = null
		}
	}

	function actionPiece(node: HTMLAnchorElement, focus: boolean) {
		if (focus) {
			node.focus()
		}
	}
</script>

{#if pieces.length === 0}
	<section class="action">
		<span>No results found for <em>{query}</em>.</span>
	</section>
{:else}
	<section class="container">
		{#each pieces as piece (piece.id)}
			<a
				use:actionPiece={pieces[0].id === piece.id}
				href="/pieces/{piece.type}/{piece.slug}"
				onmouseenter={() => {
					activePieceId = piece.id
					//pieceIcons[activePieceId].active(true)
				}}
				onmouseleave={() => {
					if (activePieceId) {
						//pieceIcons[activePieceId].active(false)
						activePieceId = null
					}
				}}
				onfocus={() => {
					activePieceId = piece.id
					//pieceIcons[activePieceId].active(true)
				}}
				onblur={() => {
					if (activePieceId) {
						//pieceIcons[activePieceId].active(false)
						activePieceId = null
					}
				}}
				ontouchstart={() => {
					activePieceId = piece.id
					//pieceIcons[activePieceId].active(true)
				}}
				ontouchend={() => {
					if (activePieceId) {
						//pieceIcons[activePieceId].active(false)
						activePieceId = null
					}
				}}
			>
				<div style="display: flex; align-items: flex-start;">
					<div style="flex: 1 1 0%;">
						<div style="display: flex;">
							<div style="align-self: baseline;">
								{#key activePieceId === piece.id}
									<PieceIcon {piece} size="small" active={activePieceId === piece.id} />
								{/key}
							</div>
							<div style="align-self: center;">
								<CaretRightIcon style="margin: auto; font-size: 2em; max-width:unset;" />
							</div>
						</div>
					</div>
					<div style="flex: 1 1 0%; align-self: center; max-height: 160px; overflow: hidden;">
						{piece.title}
					</div>
				</div></a
			>
		{/each}
	</section>
	{#if nextPage}
		<section class="action">
			{#if nextPage && query !== null}
				<button onclick={() => getNextPage(nextPage as number)}>more</button>
			{/if}
		</section>
	{/if}
{/if}

<style>
	.container {
		display: grid;
		width: 100%;
		margin: auto;
		margin-top: var(--space-10);
		margin-bottom: var(--space-10);
		grid-template-columns: 280px;
		gap: var(--space-5);
		align-items: start;
		justify-content: center;
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

	.action > button {
		background: transparent;
		color: var(--colors-primary);
		padding: none;
		border: none;
		cursor: pointer;
	}

	.action > button:hover {
		text-decoration: underline;
	}
</style>
