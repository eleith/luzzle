<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms'
	import { resolve } from '$app/paths'
	import { encodeArchivePath } from '#lib/pieces/navigation.js'

	type Props = {
		file: string
		preview?: 'saved' | 'retry'
		hasPublishedVersion?: boolean
	}

	let { file, preview, hasPublishedVersion = false }: Props = $props()
	const path = $derived(encodeArchivePath(file))
	let starting = $state(false)

	const startPreview: SubmitFunction = ({ cancel }) => {
		if (starting) {
			cancel()
			return
		}
		starting = true
		return async ({ update }) => {
			try {
				await update()
			} finally {
				starting = false
			}
		}
	}
</script>

{#if preview}
	<form
		method="post"
		action={resolve('/(auth)/admin/piece/[...path]/preview', { path })}
		use:enhance={startPreview}
		aria-busy={starting}
	>
		<button type="submit" disabled={starting}>
			{#if starting}Starting preview…
			{:else if preview === 'retry'}Generate fresh preview
			{:else}Generate{/if}
		</button>
	</form>
{/if}
{#if hasPublishedVersion}
	<a href={resolve('/(auth)/admin/piece/[...path]/published', { path })}>View published</a>
{/if}

<style>
	form {
		margin: 0;
	}
	a {
		color: var(--color-primary);
	}
	button {
		font: inherit;
		font-weight: var(--font-weight-normal);
		color: var(--color-primary);
		background: var(--color-surface-container);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-small);
		padding: var(--space-1) var(--space-2);
		max-width: 100%;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
