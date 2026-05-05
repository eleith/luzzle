<script lang="ts">
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'
	import SeoHead from '$lib/components/layout/simple/SeoHead.svelte'

	const { children } = $props()
</script>

<SeoHead />
<main>
	<NavBanner showRandom />
	{@render children()}
</main>
