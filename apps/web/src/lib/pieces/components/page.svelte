<script lang="ts">
	import type { PublicWebPiece } from '@luzzle/web.pieces'
	import type { PreparedPage } from '$lib/content/types.js'
	import PageDefault from '$lib/pieces/components/page.default.svelte'
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import { getPieceHelpers } from '$lib/pieces/helpers.js'

	type Props = {
		piece: PublicWebPiece
		tags: Array<{ slug: string; tag: string }>
		presentation: PreparedPage | null
	}

	let { piece, tags, presentation }: Props = $props()
	const helpers = $derived(getPieceHelpers(piece))
</script>

<svelte:head>
	<!-- The app retains SEO ownership; prepared head carries styles/non-conflicting content. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html presentation?.head ?? ''}
</svelte:head>

{#key piece}
	{#if presentation}
		{#if presentation.navBanner !== null}
			<NavBanner {...presentation.navBanner} />
		{/if}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html presentation.body}
	{:else}
		<PageDefault {piece} {tags} {helpers} />
	{/if}
{/key}
