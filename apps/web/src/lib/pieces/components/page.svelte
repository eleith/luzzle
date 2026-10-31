<script lang="ts">
	import { getPage } from '@luzzle/web.templates/pages'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import NavBanner from '#lib/components/layout/simple/NavBanner.svelte'
	import { getPieceHelpers } from '#lib/pieces/helpers.js'

	type Props = {
		piece: TemplatedPiece
		tags: Array<{ slug: string; tag: string }>
	}
	let { piece, tags }: Props = $props()
	const Page = $derived(getPage(piece.templates?.page.name))
	const fields = $derived(piece.templates?.page.fields ?? {})
	const helpers = $derived(getPieceHelpers(piece))
	const palette = $derived(helpers.getPiecePalette())
</script>

<NavBanner
	showRandom
	background={palette?.background || 'var(--color-surface-container)'}
	color={palette?.bodyText}
	hoverColor={palette?.accent}
/>
<Page {piece} {fields} {tags} {helpers} />
