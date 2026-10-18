<script>
	import { getContext } from 'svelte'

	let { html } = $props()
	const label = getContext('application-context')
</script>

<section data-template-host>
	<p>{label}</p>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</section>
