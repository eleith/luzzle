<script lang="ts">
	import { page } from '$app/state'
	import Page404Default from '$lib/content/components/404.default.svelte'
	import PageErrorDefault from '$lib/content/components/error.default.svelte'
</script>

{#if page.status === 404}
	<Page404Default message={page.error?.message} />
{:else}
	<PageErrorDefault status={page.status} message={page.error?.message} />
{/if}
