<script lang="ts">
	import type { Snippet } from 'svelte'
	import SeoHead from './SeoHead.svelte'
	import NavBanner from './NavBanner.svelte'

	type Props = {
		background?: string
		color?: string
		hoverColor?: string
		showHome?: boolean
		showSearch?: boolean
		showThemeToggle?: boolean
		showProgress?: boolean
		showRandom?: boolean
		items?: {
			left?: Snippet<[]>
			right?: Snippet<[]>
		}
	}
	const { background, items, showHome, showSearch, showThemeToggle, showProgress, showRandom, color, hoverColor }: Props = $props()
</script>

<SeoHead />
<NavBanner {background} {items} {showHome} {showSearch} {showThemeToggle} {showProgress} {showRandom} {color} {hoverColor} />
