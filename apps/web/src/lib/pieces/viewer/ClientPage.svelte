<script lang="ts">
	import LoadPage from '@luzzle/web.templates/pages/client'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import TemplatePage from '#lib/templates/page.svelte'
	import TemplateStatus from './TemplateStatus.svelte'

	let { piece, tags }: { piece: TemplatedPiece; tags: Array<{ slug: string; tag: string }> } =
		$props()
</script>

<LoadPage name={piece.templates.page.name}>
	{#snippet pending()}
		<TemplateStatus view="page" />
	{/snippet}
	{#snippet failed()}
		<TemplateStatus view="page" failed />
	{/snippet}
	{#snippet children(Page)}
		<TemplatePage {Page} {piece} {tags} />
	{/snippet}
</LoadPage>
