<script lang="ts">
	import type { IconProps } from '../props'
	import type { ExampleIconFields } from '../fields'

	let { piece, fields, helpers, size, lazy }: IconProps<ExampleIconFields> = $props()
	const cover = $derived(helpers.getPieceImageUrl(fields.image, size.width, 'jpg'))
</script>

{#if cover}
	<img src={cover} width={size.width} loading={lazy ? 'lazy' : 'eager'} alt="" />
{:else}
	<span>{piece.title}</span>
{/if}

<style>
	img {
		display: block;
		max-width: 100%;
	}
</style>
