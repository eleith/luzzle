<script lang="ts">
	import type { LayoutProps } from './$types'

	let { params, children }: LayoutProps = $props()
</script>

{#key params.asset}
	{@render children()}
{/key}
