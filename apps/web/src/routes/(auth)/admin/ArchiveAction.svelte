<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements'

	let { children, ...attributes }: HTMLButtonAttributes = $props()
</script>

<button type="button" class="archive-action" {...attributes}>
	{@render children?.()}
</button>

<style>
	.archive-action {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2);
		border: none;
		background: none;
		font: inherit;
		color: var(--color-on-surface-variant);
		cursor: pointer;
	}

	.archive-action:hover {
		color: var(--color-primary);
	}

	.archive-action:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.archive-action:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
