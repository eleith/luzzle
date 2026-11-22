<script lang="ts">
	import { afterNavigate } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import type { Snippet } from 'svelte'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'

	let {
		data,
		icon
	}: {
		data: {
			pieces: TemplatedPiece[]
			page: number
			year: number | null
			nextPage: number | null
		}
		icon: Snippet<[piece: TemplatedPiece, index: number, active: boolean]>
	} = $props()
	let hoveredPieceId = $state<string | null>(null)
	let focusedPieceId = $state<string | null>(null)

	afterNavigate(({ type, shallow }) => {
		if (shallow && type === 'goto') return

		if (type === 'link') {
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
	})
</script>

<h1 class="visually-hidden">
	{#if page.params.piece}
		{page.params.piece}
	{:else}
		Pieces
	{/if}
</h1>

<section>
	<div class="container">
		{#each data.pieces as piece, i (piece.id)}
			<div class="piece-card">
				<div class="piece-icon" inert aria-hidden="true">
					<div style="display: flex;">
						<div style="align-self: baseline;">
							{@render icon(piece, i, hoveredPieceId === piece.id || focusedPieceId === piece.id)}
						</div>
					</div>
				</div>
				<a
					class="piece-text"
					href={resolve(`pieces/${piece.type}/${piece.slug}`)}
					onpointerenter={() => (hoveredPieceId = piece.id)}
					onpointerleave={() => (hoveredPieceId = null)}
					onfocus={(e) => {
						if (e.currentTarget.matches(':focus-visible')) focusedPieceId = piece.id
					}}
					onblur={() => (focusedPieceId = null)}
				>
					<span>{piece.title}</span>
				</a>
			</div>
		{/each}
	</div>
</section>

{#if data.nextPage || data.page > 1}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- Query links retain the browser-resolved pathname. -->
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
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
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

	.piece-card {
		position: relative;
		isolation: isolate;
		min-height: 200px;
		display: flex;
		align-items: flex-start;
	}

	/* Stretch the title link over the decorative icon without nesting its markup. */
	.piece-text::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.piece-text:hover,
	.piece-text:focus-visible {
		text-decoration: underline;
		color: var(--color-primary);
	}

	.piece-text:focus-visible {
		outline: none;
	}

	.piece-text:focus-visible::after {
		outline: 2px solid var(--color-primary);
		outline-offset: 4px;
		border-radius: 4px;
	}

	.piece-icon {
		isolation: isolate;
		flex: 1 1 0%;
		align-self: center;
	}

	.piece-text {
		flex: 1 1 0%;
		align-self: center;
		min-width: 0;
		margin-left: var(--space-2);
		color: var(--color-on-surface);
		text-decoration: none;
	}

	.piece-text span {
		display: block;
		max-height: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
