<script lang="ts">
	import PieceIcon from '$lib/pieces/components/icon.svelte'
	import { page } from '$app/state'

	let { data } = $props()
	let pieces = $state(data.pieces)
	let activePieceId = $state<string | null>(null)
	let nextPage = $state<number | null>(data.nextPage)

	async function getNextPage(tagPage: number) {
		const params = new URLSearchParams()

		if (tagPage) {
			params.append('page', tagPage.toString())
		}

		params.append('tag', data.tag)

		const res = await fetch(`/api/pieces?${params}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		})

		if (res.ok) {
			const json = (await res.json()) as Omit<typeof data, 'type'>
			pieces = pieces.concat(json.pieces)
			nextPage = json.nextPage
		} else {
			nextPage = null
		}
	}
</script>

<svelte:head>
	{#if pieces.length === 1}
		<link
			rel="canonical"
			href="{page.data.config.url.app}/pieces/{pieces[0].type}/{pieces[0].slug}"
		/>
	{/if}
</svelte:head>

<section>
	<div class="container">
		{#each pieces as piece (piece.id)}
			<a
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
				</div>
			</a>
		{/each}
	</div>
</section>

{#if nextPage}
	<section class="action">
		{#if nextPage}
			<button onclick={() => getNextPage(nextPage as number)}>more</button>
		{/if}
	</section>
{/if}

<style>
	.container {
		display: grid;
		width: 100%;
		margin: auto;
		padding-left: var(--space-5);
		padding-bottom: var(--space-5);
		padding-right: var(--space-5);
		grid-template-columns: repeat(auto-fill, 280px);
		gap: var(--space-5);
		justify-content: space-around;
	}

	.container:last-child {
		margin-right: auto;
	}

	.action {
		text-align: center;
		padding: var(--space-5) 0 var(--space-5) 0;
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

	.piece-text {
		flex: 1 1 0%;
		align-self: center;
		max-height: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-left: var(--space-2);
	}
</style>
