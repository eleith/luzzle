<script lang="ts">
	import type { Snippet } from 'svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import { previewHref, publishedHref } from '$lib/pieces/navigation'

	type Props = {
		file: string
		saveFormId: string
		isDirty: boolean
		isSaving: boolean
		isUnpublishing?: boolean
		hasPublishedVersion: boolean
		children: Snippet
	}

	let {
		file,
		saveFormId,
		isDirty,
		isSaving,
		isUnpublishing = false,
		hasPublishedVersion,
		children
	}: Props = $props()
</script>

<div class="toolbar" role="group" aria-label="Editor actions">
	<div class="actions">
		<Button variant="editor" type="submit" form={saveFormId} disabled={!isDirty || isSaving}>
			{isSaving ? 'Saving…' : 'Save'}
		</Button>
		{@render children()}
	</div>
	<div class="status" aria-live="polite">
		<span>
			{#if isSaving}
				Saving…
			{:else if isDirty}
				Unsaved
			{:else}
				<a href={previewHref(file)} aria-label="Preview saved piece" title="Preview saved piece">
					Saved
				</a>
			{/if}
		</span>
		<span class="publication-status">
			{#if isUnpublishing}
				Unpublishing…
			{:else if hasPublishedVersion}
				<a href={publishedHref(file)}>Published</a>
			{:else}
				Unpublished
			{/if}
		</span>
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-mono-name), monospace;
		font-size: var(--font-size-xxs);
	}

	.actions {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: var(--space-1);
	}

	.status {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: var(--space-3);
		margin-left: auto;
		white-space: nowrap;
	}

	.publication-status {
		border-inline-start: 1px solid var(--editor-border, var(--color-outline));
		padding-inline-start: var(--space-3);
	}

	.status a {
		color: inherit;
		text-decoration: underline;
	}
</style>
