<script lang="ts">
	import type { PageNavbarProps } from '@luzzle/web.templates/pages/props'
	import NavBanner from '#lib/components/layout/simple/NavBanner.svelte'
	import TemplateStylesheets from './TemplateStylesheets.svelte'

	let { page }: { page: { html: string; css: string; requestedNavBar?: PageNavbarProps } } =
		$props()
</script>

{#if page.css}
	<TemplateStylesheets stylesheets={[page.css]} />
{/if}
{#if page.requestedNavBar}
	<NavBanner {...page.requestedNavBar} />
{/if}
<main id="main-content">
	<!-- Keep SSR fragment comments inside one root so the host can hydrate around them. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- Server-rendered HTML from the operator's page template. -->
	{@html `<div>${page.html}</div>`}
</main>
