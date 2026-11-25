<script lang="ts">
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import Page from '@luzzle/web.templates/pages/default'
	import type { PageNavbarProps } from '@luzzle/web.templates/pages/props'
	import NavBanner from '#lib/components/layout/simple/NavBanner.svelte'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'

	type Props = {
		piece: TemplatedPiece
		tags: Array<{ slug: string; tag: string }>
	}
	let { piece, tags }: Props = $props()
	const fields = $derived(piece.templates.page.fields)
	const helpers = $derived({ ...getPieceHelpers(piece), navBar })
</script>

{#snippet navBar(options: PageNavbarProps)}
	<NavBanner {...options} />
{/snippet}

<Page {piece} {fields} {tags} {helpers} />
