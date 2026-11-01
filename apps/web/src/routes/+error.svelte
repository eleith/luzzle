<script lang="ts">
	import type { ErrorProps } from './$types'
	import ErrorPage from '#lib/content/components/ErrorPage.svelte'

	let { error }: ErrorProps = $props()
</script>

<ErrorPage {error} />
