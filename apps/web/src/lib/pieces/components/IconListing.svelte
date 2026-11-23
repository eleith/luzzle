<script lang="ts">
	import { resolve } from '$app/paths'
	import type { Snippet } from 'svelte'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import type { IconComponent } from '@luzzle/web.templates/icons/props'
	import ClientListingIcon from './ClientListingIcon.svelte'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'
	import { iconListingPlacement } from '#lib/pieces/icon-listing/placement.js'

	type ListingData = {
		pieces: TemplatedPiece[]
		externalIcons?: { html: (string | null)[]; stylesheets: string[] }
	}

	let { data, Icon, header }: { data: ListingData; Icon?: IconComponent; header?: Snippet } =
		$props()
	let hoveredPieceId = $state<string | null>(null)
	let focusedPieceId = $state<string | null>(null)

	// A CSS string or comment can contain a literal HTML raw-text end tag.
	function escapeStyleText(css: string) {
		return css.replace(/<(?=\/style)/gi, '\\3c ')
	}
</script>

<svelte:head>
	{#each data.externalIcons?.stylesheets ?? [] as sheet (sheet)}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- Trusted template CSS escaped for an HTML style element. -->
		{@html `<style>${escapeStyleText(sheet)}</style>`}
	{/each}
</svelte:head>

{#snippet pieceIcon(piece: TemplatedPiece, index: number, active: boolean)}
	{@const markup = data.externalIcons?.html[index]}
	{#if markup != null}
		<div class="external-icon" data-active={active ? 'true' : undefined}>
			<!-- Keep SSR fragment comments below one root: a top-level empty comment would
			     be mistaken for the end of the host's raw HTML during hydration. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- Server-rendered markup from the operator's template. -->
			{@html `<div>${markup}</div>`}
		</div>
	{:else if Icon}
		{@const helpers = getPieceHelpers(piece)}
		<Icon
			{piece}
			fields={piece.templates.icon.fields}
			{helpers}
			{...iconListingPlacement(index)}
			{active}
		/>
	{:else}
		<ClientListingIcon {piece} {...iconListingPlacement(index)} {active} />
	{/if}
{/snippet}

<div class="container">
	{#if header}
		<div class="listing-header">{@render header()}</div>
	{/if}
	{#each data.pieces as piece, index (piece.id)}
		{@const active = hoveredPieceId === piece.id || focusedPieceId === piece.id}
		<div class="piece-card">
			<div class="piece-icon" inert aria-hidden="true">
				<div style="display: flex;">
					<div style="align-self: baseline;">
						{@render pieceIcon(piece, index, active)}
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

	.listing-header {
		grid-column: 1 / -1;
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
