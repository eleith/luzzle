<script>
	let { components, helpers } = $props();
	const { NavBanner } = $derived(components);
</script>

<svelte:head><meta name="discarded-head" content="discarded" /></svelte:head>
<NavBanner background="discarded-navigation" />
<p>{helpers.fail()}</p>
