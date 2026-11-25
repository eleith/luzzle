<script>
	import ErrorPage from '#lib/content/components/ErrorPage.svelte'

	let { error } = $props()
</script>

<ErrorPage {error} />
