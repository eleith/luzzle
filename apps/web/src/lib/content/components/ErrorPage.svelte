<script lang="ts">
	import type { ErrorProps } from '../../../routes/$types'
	import Page404Default from './404.default.svelte'
	import PageErrorDefault from './error.default.svelte'

	let { error }: ErrorProps = $props()
</script>

{#if error.status === 404}
	<Page404Default
		message={error.message}
		html={error.presentation?.html}
		home={error.presentation?.home ?? true}
	/>
{:else}
	<PageErrorDefault
		status={error.status}
		message={error.message}
		html={error.presentation?.html}
		home={error.presentation?.home ?? true}
	/>
{/if}
