<script>
	import { getContext, setContext, untrack } from 'svelte'

	let { data } = $props()
	// Exercise runtime identity and context, not the supported authoring subset.
	untrack(() => {
		setContext('fixture-label', data.label)
		data.capture(getContext)
	})
</script>

<p class="context">{getContext('fixture-label')}</p>

<style>
	.context {
		color: var(--color-secondary);
	}
</style>
