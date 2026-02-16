<script lang="ts">
	import Nav from '$lib/components/layout/simple/nav.svelte'
	import DiceIcon from 'virtual:icons/ph/dice-three'

	const { children } = $props()
</script>

{#snippet randomIcon()}
	<a href="/random" aria-label="random" data-sveltekit-reload>
		<DiceIcon style="font-size: 1em;" />
	</a>
{/snippet}

<main>
	<Nav items={{ right: randomIcon }} />
	{@render children()}
</main>
