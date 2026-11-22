<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import type { IconComponent } from '@luzzle/web.templates/icons/props'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'
	import { listingIconPlacement } from '#lib/pieces/listing-icon-placement.js'
	import PieceListing from '#lib/pieces/components/PieceListing.svelte'

	let {
		Icon,
		data
	}: {
		Icon: IconComponent
		data: ComponentProps<typeof PieceListing>['data'] & {
			externalIcons?: { html: (string | null)[]; css: string }
		}
	} = $props()

	// A CSS string or comment can contain a literal HTML raw-text end tag.
	const css = $derived(data.externalIcons?.css.replace(/<(?=\/style)/gi, '\\3c '))
</script>

<svelte:head>
	{#if css}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- Trusted template CSS, escaped for the style element above. -->
		{@html `<style>${css}</style>`}
	{/if}
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
		{:else}
			{@const helpers = getPieceHelpers(piece)}
			<Icon
				{piece}
				fields={piece.templates.icon.fields}
				{helpers}
				{...listingIconPlacement(index)}
				{active}
			/>
		{/if}
	{/snippet}
</PieceListing>
