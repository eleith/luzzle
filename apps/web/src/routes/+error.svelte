<script lang="ts">
	import type { ErrorProps } from './$types'
	import Page404Default from '#lib/content/components/404.default.svelte'
	import PageErrorDefault from '#lib/content/components/error.default.svelte'

	// eslint-disable-next-line svelte/valid-prop-names-in-kit-pages -- Kit 3 supplies the error prop here.
	let { error }: ErrorProps = $props()
</script>

{#if error.status === 404}
	<Page404Default message={error.message} />
{:else}
	<PageErrorDefault status={error.status} message={error.message} />
{/if}
