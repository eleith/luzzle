<script lang="ts">
	import SeoHead from '$lib/components/layout/simple/SeoHead.svelte'

	const { children } = $props()
</script>

<SeoHead />
{@render children()}
