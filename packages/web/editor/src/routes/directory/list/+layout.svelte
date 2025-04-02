<script lang="ts">
	import '$lib/components/layout/simple/theme.svelte'
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import CreateIcon from 'virtual:icons/ph/file-plus'
	import { page } from '$app/state'

	const { children } = $props()
</script>

{#snippet createIcon()}
	<a href="/pieces/create/{page.params.directory}" aria-label="rss feed"><CreateIcon style="font-size: 1em;" /></a>
{/snippet}

<main>
	<Nav items={{ right: createIcon }} />
	{@render children()}
</main>
