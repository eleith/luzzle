<script lang="ts">
	import '$lib/ui/styles/reset.css'
	import '$lib/ui/styles/theme.css'
	import '$lib/ui/styles/elements.css'
	import AtIcon from 'virtual:icons/ph/at'
	import SearchIcon from 'virtual:icons/ph/magnifying-glass'
	import SunIcon from 'virtual:icons/ph/sun-dim'
	import MoonIcon from 'virtual:icons/ph/moon'
	import RainbowIcon from 'virtual:icons/ph/rainbow'
	import ArrowRightIcon from 'virtual:icons/ph/caret-double-right'
	import PaletteIcon from 'virtual:icons/ph/palette'
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

	function setTheme(theme: Theme | 'system') {
		const oneYear = 7 * 24 * 60 * 60 * 52

		currentTheme = theme
		window.localStorage.setItem('theme', theme)
		document.cookie = `theme=${theme}; max-age=${oneYear}; path=/; SameSite=Strict`
		document.body.setAttribute('data-theme', currentTheme)
	}

	function getTheme(): Theme | null | 'system' {
		const local = window.localStorage.getItem('theme') as Theme | null | 'system'
		const cookie = document.cookie
			.split('; ')
			.find((cookie) => cookie.startsWith('theme='))
			?.split('=')[1] as Theme | null | 'system'

		if (local && local !== cookie) {
			setTheme(local)
		} else if (cookie && cookie !== local) {
			setTheme(cookie)
		}

		return local || cookie || 'system'
	}

	function clickTheme(event: MouseEvent) {
		event.preventDefault()
		const themeIndex = themes.indexOf(currentTheme as Theme)
		const nextThemeIndex = (themeIndex + 1) % themes.length
		const nextTheme = themes[nextThemeIndex]

		setTheme(nextTheme)
	}

	$effect.pre(() => {
		const theme = getTheme()
		if (!theme || theme === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
			currentTheme = prefersDark ? 'dark' : 'light'
			setTheme(currentTheme)
		} else if (theme && themes.includes(theme) && theme !== currentTheme) {
			currentTheme = theme
			document.body.setAttribute('data-theme', currentTheme)
		}
	})
</script>

<svelte:head>
	<title>{PUBLIC_SITE_TITLE}</title>
	<meta name="description" content={PUBLIC_SITE_DESCRIPTION} />
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
			{#if currentTheme === null}
				<PaletteIcon style="font-size: 1em;visibility: hidden;" />
			{:else if currentTheme === 'dark'}
				<SunIcon style="font-size: 1em;" />
			{:else if currentTheme === 'light'}
				<RainbowIcon style="font-size: 1em;" />
			{:else if currentTheme === 'rainbow'}
				<TreeIcon style="font-size: 1em;" />
			{:else}
				<MoonIcon style="font-size: 1em;" />
			{/if}
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
</style>
