<script lang="ts">
	import { browser } from '$app/env'
	import { page } from '$app/state'

	const meta = $derived(page.data.meta ?? {})
	const content = $derived(page.data.config?.content.text)
	const assets = $derived(page.data.config?.url.app_assets ?? '')
</script>

<svelte:head>
	{#if meta.title}
		<title>{meta.title}</title>
		<meta property="og:title" content={meta.title} />
	{:else}
		<title>{content?.title ?? 'Luzzle Explorer'}</title>
		<meta property="og:title" content={content?.title ?? 'Luzzle Explorer'} />
	{/if}
	{#if meta.description}
		<meta name="description" content={meta.description} />
		<meta property="og:description" content={meta.description} />
	{:else}
		<meta name="description" content={content?.description ?? ''} />
		<meta property="og:description" content={content?.description ?? ''} />
	{/if}
	{#if meta.image}
		<meta property="og:image" content={meta.image} />
	{:else}
		<meta property="og:image" content="{assets}/images/opengraph.png" />
	{/if}
	{#if meta.type}
		<meta property="og:type" content={meta.type} />
	{:else}
		<meta property="og:type" content="website" />
	{/if}
	<meta property="og:url" content={page.url.href} />
	<meta property="og:locale" content="en_US" />
	<link rel="icon" href="{assets}/images/favicon.png" />
	{#if !browser}
		<script>
			;(function () {
				var raw = window.localStorage.getItem('theme')
				var preference = raw === 'dark' || raw === 'light' || raw === 'system' ? raw : 'system'
				document.documentElement.setAttribute('data-theme-preference', preference)

				var appliedTheme = preference
				if (preference === 'system') {
					appliedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
						? 'dark'
						: 'light'
				}

				document.documentElement.setAttribute('data-theme', appliedTheme)
			})()
		</script>
	{/if}
</svelte:head>
