<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'
	import { type PieceMode } from '$lib/pieces/helpers.js'
	import { page } from '$app/state'
	import { setContext } from 'svelte'

	setContext<PieceMode>('piece-mode', 'preview')

	const { children } = $props()
	const backUrl = page.url.searchParams.get('returnTo') || `/editor/piece/${page.data.file}/source`
</script>

<div class="banner">
	<div class="message">PREVIEW MODE</div>
	<a href={backUrl}>
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
