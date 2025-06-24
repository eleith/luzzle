<script lang="ts">
	import { page as pageStore } from '$app/stores'
	import PieceIcon from '$lib/pieces/components/icon/index.svelte'
	import CaretRightIcon from 'virtual:icons/ph/caret-right-thin'

	let { data } = $props()

	let pieces = $state(data.pieces)
	let activePieceId = $state<string | null>(null)
	let nextPage = $state<number | null>(data.nextPage)

	async function getNextPage(page: number) {
		const params = new URLSearchParams()

		if (page) {
			params.append('page', page.toString())
		}

		params.append('tag', $pageStore.params.tag)

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
		margin-top: var(--space-10);
		margin-bottom: var(--space-10);
		grid-template-columns: repeat(auto-fill, 280px);
		gap: var(--space-5);
		align-items: start;
		justify-content: center;
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
</style>
