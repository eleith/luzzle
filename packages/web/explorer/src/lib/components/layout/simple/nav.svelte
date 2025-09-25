<script lang="ts">
	import NavigationIcon from 'virtual:icons/ph/arrow-up-left'
	import SearchIcon from 'virtual:icons/ph/magnifying-glass'
	import SunIcon from 'virtual:icons/ph/sun-dim'
	import MoonIcon from 'virtual:icons/ph/moon'
	import FaderIcon from 'virtual:icons/ph/faders'
	import themes, { type Theme } from '$lib/ui/styles/themes'
	import { browser } from '$app/environment'
	import { page } from '$app/state'
	import { fly, fade } from 'svelte/transition'
	import { createDialog, melt } from '@melt-ui/svelte'
	import type { Snippet } from 'svelte'
	import { onMount } from 'svelte'

	type Props = {
		background?: string
		items?: {
			left?: Snippet<[]>
			right?: Snippet<[]>
		}
	}
	const { background, items }: Props = $props()
	const {
		elements: { content, trigger, portalled, overlay },
		states: { open }
	} = createDialog({})

	function clickSearch(event: MouseEvent) {
		event.preventDefault()
	}

	function focusSearch(input: HTMLInputElement) {
		input.focus()
	}

	function submitSearch() {
		$open = false
	}

	function getThemePreference(): Theme {
		return (window.localStorage.getItem('theme') || 'system') as Theme
	}

	function applyTheme(preference: Theme) {
		const themeToApply =
			preference === 'system'
				? window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light'
				: preference
		document.documentElement.setAttribute('data-theme', themeToApply)
	}

	function setTheme(preference: Theme) {
		const oneYear = 7 * 24 * 60 * 60 * 52
		window.localStorage.setItem('theme', preference)
		document.cookie = `theme=${preference}; max-age=${oneYear}; path=/; SameSite=Strict`
		document.documentElement.setAttribute('data-theme-preference', preference)
		applyTheme(preference)
	}

	onMount(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

		const handleChange = () => {
			if (getThemePreference() === 'system') {
				applyTheme('system')
			}
		}

		mediaQuery.addEventListener('change', handleChange)

		return () => {
			mediaQuery.removeEventListener('change', handleChange)
		}
	})

	function clickTheme(event: MouseEvent) {
		event.preventDefault()
		const current = getThemePreference()
		const themeIndex = themes.indexOf(current as Theme)
		const nextThemeIndex = (themeIndex + 1) % themes.length
		const nextTheme = themes[nextThemeIndex]
		setTheme(nextTheme)
	}
</script>

<svelte:head>
	{#if page.data.meta.title}
		<title>{page.data.meta.title}</title>
		<meta property="og:title" content={page.data.meta.title} />
	{:else}
		<title>{page.data.config.text.title}</title>
		<meta property="og:title" content={page.data.config.text.title} />
	{/if}
	{#if page.data.meta.description}
		<meta name="description" content={page.data.meta.description} />
		<meta property="og:description" content={page.data.meta.description} />
	{:else}
		<meta name="description" content={page.data.config.text.description} />
		<meta property="og:description" content={page.data.config.text.description} />
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
				let preference = window.localStorage.getItem('theme') || 'system'
				document.documentElement.setAttribute('data-theme-preference', preference)

				let appliedTheme = preference
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

{#if $open}
	<div use:melt={$portalled}>
		<div use:melt={$overlay} class="searchOverlay" transition:fade={{ duration: 50 }}></div>
		<div
			class="search"
			transition:fly={{ y: -500, opacity: 100, duration: 500 }}
			use:melt={$content}
		>
			<div>
				<form method="GET" action="/search" style="display:flex;gap:10px;" onsubmit={submitSearch}>
					<input
						type="search"
						placeholder="the electric stAte ..."
						use:focusSearch
						name="query"
						class="input"
						onkeydown={(e) => {
							if (e.key === 'escape') {
								$open = false
							}
						}}
					/>
					<button type="submit" class="button" aria-label="submit search">search</button>
				</form>
			</div>
			<div></div>
		</div>
	</div>
{/if}

<nav class="banner" style:--banner-background-color={background || 'transparent'}>
	<div class="left">
		{#if page.url.pathname !== '/'}
			<a href="/" aria-label="main page"><NavigationIcon style="font-size: 1em;" /></a>
		{/if}
		{#if items?.left}
			{@render items.left()}
		{/if}
	</div>
	<div class="right">
		<a href="/search" onclick={clickSearch} use:melt={$trigger} aria-label="search">
			<SearchIcon style="font-size: 1em;" />
		</a>
		{#if items?.right}
			{@render items.right()}
		{/if}
		<button onclick={clickTheme} aria-label="change theme">
			<SunIcon class="themeIcons themeIconsLight" />
			<FaderIcon class="themeIcons themeIconsSystem" />
			<MoonIcon class="themeIcons themeIconsDark" />
		</button>
	</div>
</nav>

<style>
	.banner {
		display: flex;
		justify-content: space-between;
		background-color: var(--banner-background-color, var(--colors-surface));
	}

	.left {
		padding: var(--space-5);
		display: flex;
		align-items: left;
	}

	.right {
		padding: var(--space-5);
		display: flex;
		align-items: right;
		gap: var(--space-5);
	}

	.banner :global(a),
	.banner :global(button) {
		display: block-inline;
		cursor: pointer;
		color: var(--colors-on-surface);
		background: transparent;
		border: none;
	}

	.banner :global(a):hover,
	.banner :global(button):hover {
		color: var(--colors-primary);
	}

	.search {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}

	.search > div:first-child {
		padding: 20px;
		background: var(--colors-surface-container-high);
		height: 200px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.search > div:nth-child(2) {
		background: var(--colors-surface-container-high);
		border-bottom: 2px solid var(--colors-outline);
	}

	.searchOverlay {
		position: fixed;
		inset: 0;
		opacity: 0.5;
		background: var(--colors-surface-inverse);
	}

	:global(.themeIcons) {
		font-size: 1em;
		display: none;
	}

	:global(html[data-theme-preference='dark'] .themeIconsLight) {
		display: inline-block;
	}

	:global(html[data-theme-preference='light'] .themeIconsSystem) {
		display: inline-block;
	}

	:global(html[data-theme-preference='system'] .themeIconsDark) {
		display: inline-block;
	}
</style>
