<script lang="ts">
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import SeoHead from '$lib/components/layout/simple/SeoHead.svelte'
	import DiceIcon from 'virtual:icons/ph/dice-three'

	const { children } = $props()
</script>

{#snippet randomIcon()}
	<a href="/random" aria-label="random" data-sveltekit-reload>
		<DiceIcon style="font-size: 1em;" />
	</a>
{/snippet}

<SeoHead />
<main>
	<NavBanner items={{ right: randomIcon }} />
	{@render children()}
</main>
