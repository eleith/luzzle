<script lang="ts">
	import { page } from '$app/state'
	import loadContent from '$lib/content/load'
	import Page404Default from '$lib/content/components/404.default.svelte'
	import PageErrorDefault from '$lib/content/components/error.default.svelte'
	import ContentBanner from '$lib/content/components/ContentBanner.svelte'
	import PieceIcon from '$lib/pieces/components/icon.svelte'

	const glob404 = import.meta.glob('$lib/content/components/custom/404.svelte', { eager: true })
	const globError = import.meta.glob('$lib/content/components/custom/error.svelte', { eager: true })

	const Page404 = $derived(loadContent('404', Page404Default, glob404))
	const PageError = $derived(loadContent('error', PageErrorDefault, globError))

	const components = { ContentBanner, PieceIcon }
</script>

{#if page.status === 404}
	<Page404 message={page.error?.message} {components} />
{:else}
	<PageError status={page.status} message={page.error?.message} {components} />
{/if}
