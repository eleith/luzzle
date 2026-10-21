<script>
	import NavBanner from '$lib/components/layout/simple/NavBanner.svelte'

	let { data } = $props()
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html data.head}
</svelte:head>

{#if data.navigation}
	<NavBanner {...data.navigation} />
{/if}

<p id="selected-revision">{data.state}</p>
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html data.body}
