<script lang="ts">
	import '$lib/ui/styles/reset.css'
	import '$lib/ui/styles/theme.css'
	import '$lib/ui/styles/elements.css'
	import NavigationIcon from 'virtual:icons/ph/arrow-up-left'
	import SunIcon from 'virtual:icons/ph/sun-dim'
	import MoonIcon from 'virtual:icons/ph/moon'
	import themes, { type Theme } from '$lib/ui/styles/themes'
	import { page } from '$app/state'
	import type { Snippet } from 'svelte'
	import { PUBLIC_SITE_DESCRIPTION, PUBLIC_SITE_TITLE } from '$env/static/public'

	type Props = {
		background?: string
		items?: {
			left?: Snippet
			right?: Snippet
		}
		theme?: Theme
	}
	const { background, items, theme: initialTheme }: Props = $props()

	let currentTheme = $state<Theme | 'system' | null>(initialTheme || null)

	function getTheme(): Theme | 'system' {
		return window.localStorage.getItem('theme') as Theme | 'system'
	}

	function setTheme(theme: Theme | 'system') {
		const oneYear = 7 * 24 * 60 * 60 * 52

		currentTheme = theme
		window.localStorage.setItem('theme', theme)
		document.cookie = `theme=${theme}; max-age=${oneYear}; path=/; SameSite=Strict`
		document.documentElement.setAttribute('data-theme', currentTheme)
	}

	function clickTheme(event: MouseEvent) {
		event.preventDefault()
		const currentTheme = getTheme()
		const themeIndex = themes.indexOf(currentTheme as Theme)
		const nextThemeIndex = (themeIndex + 1) % themes.length
		const nextTheme = themes[nextThemeIndex]

		setTheme(nextTheme)
	}
</script>

<svelte:head>
	<title>{PUBLIC_SITE_TITLE}</title>
	<meta name="description" content={PUBLIC_SITE_DESCRIPTION} />
	<style>
		@font-face {
			font-family: 'Noto Sans';
			font-optical-sizing: auto;
			font-weight: 300 600;
			font-style: normal;
			font-variation-settings: 'wdth' 300;
			src: var(--font-url-noto-sans) format('woff2');
			font-display: swap;
		}

		@font-face {
			font-family: 'Adjusted Sans';
			src: local(Dejavu Sans), local(Verdana), sans-serif;
			size-adjust: 92%;
		}

		html {
			font-family: 'Noto Sans', 'Adjusted Sans';
		}
	</style>
	<script>
		const localTheme = window.localStorage.getItem('theme')
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
		const theme = localTheme ?? (prefersDark ? 'dark' : 'light')

		document.documentElement.setAttribute('data-theme', theme)
	</script>
</svelte:head>

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
		{#if items?.right}
			{@render items.right()}
		{/if}
		<button onclick={clickTheme} aria-label="change theme">
			<SunIcon class="themeIcons themeIconsSun" />
			<MoonIcon class="themeIcons themeIconsMoon" />
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
		gap: var(--space-2);
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

	:global(.themeIcons) {
		font-size: 1em;
		display: none;
	}

	:global(html[data-theme='dark'] .themeIconsSun) {
		display: inline-block;
	}

	:global(html[data-theme='light'] .themeIconsMoon) {
		display: inline-block;
	}
</style>
