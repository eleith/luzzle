<script lang="ts">
	import '$lib/ui/styles/reset.css'
	import '$lib/ui/styles/theme.css'
	import '$lib/ui/styles/elements.css'
	import AtIcon from 'virtual:icons/ph/at'
	import SearchIcon from 'virtual:icons/ph/magnifying-glass'
	import SunIcon from 'virtual:icons/ph/sun-dim'
	import MoonIcon from 'virtual:icons/ph/moon'
	import ArrowRightIcon from 'virtual:icons/ph/caret-double-right'
	import TreeIcon from 'virtual:icons/ph/tree'
	import themes, { type Theme } from '$lib/ui/styles/themes'
	import { page } from '$app/stores'
	import { fly, fade } from 'svelte/transition'
	import { createDialog, melt } from '@melt-ui/svelte'
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
						placeholder="the electric state ..."
						use:focusSearch
						name="query"
						class="input"
					/>
					<button type="submit" class="button" aria-label="submit search">
						<ArrowRightIcon style="font-size: 1.75em;" />
					</button>
				</form>
			</div>
			<div></div>
		</div>
	</div>
{/if}

<nav class="banner" style:--banner-background-color={background || 'transparent'}>
	<div class="left">
		{#if $page.url.pathname !== '/'}
			<a href="/" aria-label="main page"><AtIcon style="font-size: 1em;" /></a>
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
			<SunIcon class="themeIcons themeIconsSun" />
			<TreeIcon class="themeIcons themeIconsTree" />
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
		height: 150px;
		clip-path: polygon(0 0, 100% 0, 100% 80%, 0 15%);
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

	:global(html[data-theme='dark'] .themeIconsSun) {
		display: inline-block;
	}

	:global(html[data-theme='light'] .themeIconsTree) {
		display: inline-block;
	}

	:global(html[data-theme='forest'] .themeIconsMoon) {
		display: inline-block;
	}
</style>
