<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import type { IconComponent } from '@luzzle/web.templates/icons/props'
	import { getPieceHelpers } from '#lib/pieces/helpers/page-state.js'
	import PieceListing from '#lib/pieces/components/PieceListing.svelte'

	let {
		Icon,
		data
	}: {
		Icon: IconComponent
		data: ComponentProps<typeof PieceListing>['data']
	} = $props()
</script>

<PieceListing {data}>
	{#snippet icon(piece, index, active)}
		{@const helpers = getPieceHelpers(piece)}
		<Icon
			{piece}
			fields={piece.templates.icon.fields}
			{helpers}
			size={{ width: 125 }}
			lazy={index >= 5}
			{active}
		/>
	{/snippet}
</PieceListing>
