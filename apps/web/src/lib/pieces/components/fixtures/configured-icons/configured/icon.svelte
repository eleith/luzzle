<script lang="ts">
	import type { PieceIconProps } from '@luzzle/web.templates/pieces/props'

	let props: PieceIconProps = $props()
	const bound = $derived(props.helpers.forPiece(props.data.piece))
</script>

<a
	class="configured-icon"
	href={bound.getUrl()}
	data-props={Object.keys(props).sort().join(',')}
	data-helpers={Object.keys(props.helpers).sort().join(',')}
	data-size={`${props.options.size.width}x${props.options.size.height}`}
	data-lazy={props.options.lazy}
	data-active={props.options.active}
	data-accent={bound.getPalette()?.accent}
	data-static={props.helpers.getStaticAssetUrl('images/favicon.png')}
	data-invalid-static={props.helpers.getStaticAssetUrl('../private.svg')}
>
	<img src={bound.getImageUrl('cover', props.options.size.width, 'jpg')} alt="Configured cover" />
	{props.data.piece.title}
</a>
