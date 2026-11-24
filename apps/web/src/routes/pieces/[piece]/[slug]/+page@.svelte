<script lang="ts">
	import SeoHead from '#lib/components/layout/simple/SeoHead.svelte'
	import NavBanner from '#lib/components/layout/simple/NavBanner.svelte'
	import TemplateStylesheets from '#lib/templates/TemplateStylesheets.svelte'
	import type { PageProps } from './$types'

	let { data }: PageProps = $props()
	const page = $derived(data.renderedPage)
</script>

<SeoHead />
{#if page.css}
	<TemplateStylesheets stylesheets={[page.css]} />
{/if}
{#if page.requestedNavBar?.position === 'before-content'}
	<NavBanner {...page.requestedNavBar} />
{/if}
<main id="main-content">
	<!-- Keep SSR fragment comments inside one root so the host can hydrate around them. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- Server-rendered HTML from the operator's page template. -->
	{@html `<div>${page.html}</div>`}
</main>
{#if page.requestedNavBar?.position === 'after-content'}
	<NavBanner {...page.requestedNavBar} />
{/if}
