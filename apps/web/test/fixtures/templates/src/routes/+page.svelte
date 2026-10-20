<script>
	let { data } = $props()
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html data.head}
</svelte:head>

<p id="selected-revision">{data.state}</p>
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html data.body}
