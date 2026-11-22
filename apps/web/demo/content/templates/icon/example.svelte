<script lang="ts">
	import type { IconProps } from './props'

	type Fields = { cover?: string }
	let { piece, fields, helpers }: IconProps<Fields> = $props()
	const cover = $derived(helpers.getPieceImageUrl(fields.cover, 500, 'jpg'))
</script>

{#if cover}
	<img src={cover} alt="" />
{:else}
	<span>{piece.title}</span>
{/if}

<style>
	img {
		display: block;
		max-width: 100%;
	}
</style>
