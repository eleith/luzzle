<script lang="ts">
	import { browser } from '$app/environment'
	import { page } from '$app/state'
</script>

<svelte:head>
	{#if page.data.meta.title}
		<title>{page.data.meta.title}</title>
		<meta property="og:title" content={page.data.meta.title} />
	{:else}
		<title>{page.data.config.content.text.title}</title>
		<meta property="og:title" content={page.data.config.content.text.title} />
	{/if}
	{#if page.data.meta.description}
		<meta name="description" content={page.data.meta.description} />
		<meta property="og:description" content={page.data.meta.description} />
	{:else}
		<meta name="description" content={page.data.config.content.text.description} />
		<meta property="og:description" content={page.data.config.content.text.description} />
	{/if}
	{#if page.data.meta.image}
		<meta property="og:image" content={page.data.meta.image} />
	{:else}
		<meta property="og:image" content="{page.data.config.url.app_assets}/images/opengraph.png" />
	{/if}
	{#if page.data.meta.type}
		<meta property="og:type" content={page.data.meta.type} />
	{:else}
		<meta property="og:type" content="website" />
	{/if}
	<meta property="og:url" content={page.url.href} />
	<meta property="og:locale" content="en_US" />
	<link rel="icon" href="{page.data.config.url.app_assets}/images/favicon.png" />
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
