<script lang="ts">
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import type { PageComponent, PageNavbarProps } from '@luzzle/web.templates/pages/props'
	import NavBanner from '#lib/components/layout/simple/NavBanner.svelte'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'

	type Props = {
		Page: PageComponent
		piece: TemplatedPiece
		tags: Array<{ slug: string; tag: string }>
	}
	// Callers supply the component; a runtime catalog import here would load all page CSS.
	let { Page, piece, tags }: Props = $props()
	const fields = $derived(piece.templates?.page.fields ?? {})
	const helpers = $derived({ ...getPieceHelpers(piece), navBar })
</script>

{#snippet navBar(options: PageNavbarProps)}
	<NavBanner {...options} />
{/snippet}

<Page {piece} {fields} {tags} {helpers} />
