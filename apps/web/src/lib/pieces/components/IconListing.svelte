<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import type { IconComponent } from '@luzzle/web.templates/icons/props'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'
	import { iconListingPlacement } from '#lib/pieces/icon-listing/placement.js'
	import PieceListing from '#lib/pieces/components/PieceListing.svelte'

	type Listing = ComponentProps<typeof PieceListing>
	type ListingData = Listing['data'] & {
		externalIcons?: { html: (string | null)[]; stylesheets: string[] }
	}

	type ComponentFallback = { data: ListingData; Icon: IconComponent; fallback?: never }
	type SnippetFallback = { data: ListingData; Icon?: never; fallback: Listing['icon'] }

	let { Icon, fallback, data }: ComponentFallback | SnippetFallback = $props()

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

<PieceListing {data}>
	{#snippet icon(piece, index, active)}
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
			{@render fallback?.(piece, index, active)}
		{/if}
	{/snippet}
</PieceListing>
