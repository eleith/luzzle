<script lang="ts">
	import DefaultPieceIcon from '../components/DefaultPieceIcon.svelte'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import IconFragment from '../components/IconFragment.svelte'
	import TemplateStylesheets from '#lib/templates/TemplateStylesheets.svelte'

	const renderWidth = 500
	let {
		piece,
		renderedIcon
	}: { piece: TemplatedPiece; renderedIcon: { html: string; css: string } | undefined } = $props()
</script>

{#if renderedIcon?.css}
	<TemplateStylesheets stylesheets={[renderedIcon.css]} />
{/if}

<main
	id="main-content"
	class="icon-viewport"
	aria-label="Piece icon"
	style:--render-width="{renderWidth}px"
>
	<div class="scale-container">
		<div class="icon-frame" role="img" aria-label="Icon preview for {piece.title}">
			{#if renderedIcon}
				<div inert aria-hidden="true">
					<IconFragment markup={renderedIcon.html} active={false} />
				</div>
			{:else}
				<DefaultPieceIcon {piece} size={{ width: renderWidth }} />
			{/if}
		</div>
	</div>
</main>

<style>
	.icon-viewport {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--space-8);
		min-height: 80vh;
		background: var(--color-surface-container-low);
	}
	.scale-container {
		width: 100%;
		min-width: 0;
		max-width: var(--render-width);
		container-type: inline-size;
	}
	/* Older browsers can scroll the full design without widening the page. */
	@supports not (zoom: min(1, tan(atan2(100cqi, 500px)))) {
		.scale-container {
			overflow-x: auto;
		}
	}
	.icon-frame {
		width: var(--render-width);
		/* Unitless container width / render width, including before hydration. */
		zoom: min(1, tan(atan2(100cqi, var(--render-width))));
		margin-inline: auto;
		box-shadow: var(--shadow-raised);
		outline: 1px solid var(--color-outline-variant);
	}
</style>
