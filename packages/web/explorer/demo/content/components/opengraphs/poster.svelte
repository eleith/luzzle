<script lang="ts">
	import { type PieceOpengraphProps } from '$lib/pieces/helpers'
	import Icon from '$lib/pieces/components/icon.svelte'

	let { piece, palette, helpers, metadata }: PieceOpengraphProps = $props()

	const backdrop = metadata.backdrop as string | undefined
	const backdropImage = backdrop ? helpers.getPieceImageUrl(backdrop, 1200, 'jpg') : null
</script>

<section
	class="container"
	class:backdrop={!!backdrop}
	style="
		--backdrop-image: url('{backdropImage}');
		--color-main-text: {palette?.bodyText};
		--color-title-text: {palette?.titleText};
		--color-background: {palette?.background};
		--color-accent: {palette?.accent};"
>
	<div class="cover"></div>
	<div class="outer">
		<div class="inner">
			<Icon {piece} size={{ width: 500 }} lazy={false} />
		</div>
	</div>
</section>

<style>
	section.container {
		display: flex;
		width: 100%;
		height: 100%;
		border-bottom: 10px solid var(--color-accent);
		position: relative;
	}

	section.container.backdrop {
		background-image: var(--backdrop-image);
		background-size: cover;
		background-position: center center;
	}

	.cover {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: var(--color-background);
		opacity: 0.8;
	}

	.outer {
		width: 100%;
		height: 100%;
		display: flex;
		position: relative;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.inner {
		margin-top: 250px;
	}
</style>
