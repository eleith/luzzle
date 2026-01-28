<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'
	import { page } from '$app/state'

	const { children } = $props()
</script>

<div class="banner">
	<div class="message">PREVIEW MODE</div>
	<a href="/editor/piece/{page.data.file}">
		<Button variant="tertiary">Back to Editor</Button>
	</a>
</div>

{@render children()}

<style>
	.banner {
		background-color: var(--color-primary);
		padding: var(--space-2);
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--color-outline);
	}

	.message {
		font-weight: bold;
		color: var(--color-on-primary);
	}
</style>
