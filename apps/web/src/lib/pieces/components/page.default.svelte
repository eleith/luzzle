<script lang="ts">
	import type { ComponentProps } from 'svelte'
	import DefaultPage from '@luzzle/web.templates/components/page.default.svelte'
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'

	let { piece, tags, helpers }: ComponentProps<typeof DefaultPage> = $props()
</script>

<NavBanner showRandom />
<DefaultPage {piece} {tags} {helpers} />
