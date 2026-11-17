<script lang="ts">
	import LoadIcon from '@luzzle/web.templates/icons/client'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import IconViewport from './IconViewport.svelte'
	import TemplateStatus from './TemplateStatus.svelte'

	let { piece }: { piece: TemplatedPiece } = $props()
</script>

<LoadIcon name={piece.templates.icon.name}>
	{#snippet pending()}
		<TemplateStatus view="icon" />
	{/snippet}
	{#snippet failed()}
		<TemplateStatus view="icon" failed />
	{/snippet}
	{#snippet children(Icon)}
		<IconViewport {Icon} {piece} />
	{/snippet}
</LoadIcon>
