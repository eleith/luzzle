<script lang="ts">
	import LoadIcon from '@luzzle/web.templates/icons/client'
	import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'
	import type { Snippet } from 'svelte'
	import IconFragment from '../components/IconFragment.svelte'
	import IconStylesheets from '../components/IconStylesheets.svelte'
	import { getPieceHelpers } from '../helpers/page-state.js'
	import TemplateStatus from './TemplateStatus.svelte'

	const renderWidth = 500
	let {
		piece,
		renderedIcon
	}: { piece: TemplatedPiece; renderedIcon: { html: string; css: string } | undefined } = $props()
</script>

{#snippet viewport(content: Snippet)}
	<main
		id="main-content"
		class="icon-viewport"
		aria-label="Piece icon"
		style:--render-width="{renderWidth}px"
	>
		<div class="scale-container">
			<div class="icon-frame">{@render content()}</div>
		</div>
	</main>
{/snippet}

{#if renderedIcon}
	{#if renderedIcon.css}
		<IconStylesheets stylesheets={[renderedIcon.css]} />
	{/if}
	{#snippet fragment()}
		<div role="img" aria-label="Icon preview for {piece.title}">
			<div inert aria-hidden="true">
				<IconFragment markup={renderedIcon.html} active={false} />
			</div>
		</div>
	{/snippet}
	{@render viewport(fragment)}
{:else}
	<LoadIcon name={piece.templates.icon.name}>
		{#snippet pending()}
			<TemplateStatus view="icon" />
		{/snippet}
		{#snippet failed()}
			<TemplateStatus view="icon" failed />
		{/snippet}
		{#snippet children(Icon)}
			{#snippet composition()}
				<Icon
					{piece}
					fields={piece.templates.icon.fields}
					helpers={getPieceHelpers(piece)}
					size={{ width: renderWidth }}
					lazy={false}
				/>
			{/snippet}
			{@render viewport(composition)}
		{/snippet}
	</LoadIcon>
{/if}

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
