<script lang="ts">
	import SunIcon from 'virtual:icons/ph/sun-dim'
	import MoonIcon from 'virtual:icons/ph/moon'
	import FaderIcon from 'virtual:icons/ph/faders'
	import themes, { type Theme } from '$lib/ui/styles/themes'
	import { onMount } from 'svelte'

	function getThemePreference(): Theme {
		const raw = window.localStorage.getItem('theme')
		return raw === 'dark' || raw === 'light' || raw === 'system' ? raw : 'system'
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

<button onclick={clickTheme} aria-label="change theme">
	<SunIcon class="themeIcons themeIconsLight" />
	<FaderIcon class="themeIcons themeIconsSystem" />
	<MoonIcon class="themeIcons themeIconsDark" />
</button>

<style>
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
