<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import PieceIcon from '$lib/pieces/components/icon.svelte'

	let { data } = $props()
	let activePieceId = $state<string | null>(null)

	afterNavigate(({ type }) => {
		if (type === 'link') {
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
	})
</script>

<section>
	<div class="container">
		{#each data.pieces as piece, i (piece.id)}
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
				<div class="piece-card">
					<div class="piece-icon">
						<div style="display: flex;">
							<div style="align-self: baseline;">
								<PieceIcon
									{piece}
									size={{ width: 125 }}
									lazy={i >= 5}
									active={activePieceId === piece.id}
								/>
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

{#if data.nextPage || data.page > 1}
	<section class="action">
		{#if data.page > 1}
			{#if data.year}
				<a href="?page={data.page - 1}&year={data.year}">prev</a>
			{:else}
				<a href="?page={data.page - 1}">prev</a>
			{/if}
		{/if}
		{#if data.nextPage}
			{#if data.year}
				<a href="?page={data.nextPage}&year={data.year}">next</a>
			{:else}
				<a href="?page={data.nextPage}">next</a>
			{/if}
		{/if}
	</section>
{/if}

<style>
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

	.action {
		text-align: center;
		padding: var(--space-5) 0 var(--space-5) 0;
	}

	.container > a {
		cursor: pointer;
		min-height: 200px;
		cursor: pointer;
		text-decoration: none;
	}

	.container > a .piece-text {
		color: var(--color-on-surface);
	}

	.container > a:hover .piece-text {
		text-decoration: underline;
		color: var(--color-primary);
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
</style>
