<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import GearIcon from 'virtual:icons/ph/gear'
	import { onMount } from 'svelte'

	const { children } = $props()

	let isAdmin = $state(false)

	onMount(() => {
		isAdmin = localStorage.getItem('luzzle.admin') === 'true'
	})
</script>

{#snippet adminLink()}
	{#if isAdmin}
		<a href="/admin" aria-label="admin">
			<GearIcon style="font-size: 1em;" />
		</a>
	{/if}
{/snippet}

<Nav showRandom items={{ right: adminLink }} />
<main id="main-content" role="main">
	{@render children()}
</main>
