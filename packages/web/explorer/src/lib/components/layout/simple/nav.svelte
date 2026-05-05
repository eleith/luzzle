<script lang="ts">
	import type { Snippet } from 'svelte'
	import SeoHead from './SeoHead.svelte'
	import NavBanner from './NavBanner.svelte'

	type Props = {
		background?: string
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
	const { background, items, showHome, showSearch, showThemeToggle, showProgress, showRandom }: Props = $props()
</script>

<SeoHead />
<NavBanner {background} {items} {showHome} {showSearch} {showThemeToggle} {showProgress} {showRandom} />
