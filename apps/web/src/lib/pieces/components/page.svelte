<script lang="ts">
	import { getPage } from '@luzzle/web.templates/pages'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import TemplatePage from '#lib/templates/page.svelte'

	type Props = {
		piece: TemplatedPiece
		tags: Array<{ slug: string; tag: string }>
	}
	let { piece, tags }: Props = $props()
	const Page = $derived(getPage(piece.templates?.page.name))
</script>

<TemplatePage {Page} {piece} {tags} />
