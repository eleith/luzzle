<script lang="ts">
	import type { Snippet } from 'svelte'
	import { goto } from '$app/navigation'
	import Button from '$lib/components/ui/Button.svelte'
	import { previewHref, publishHref, publishedHref } from '$lib/pieces/navigation'

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
	const needsSave = $derived(isDirty || isSaving)
</script>

<div class="toolbar" role="group" aria-label="Editor actions">
	<div class="actions">
		<Button variant="editor" type="submit" form={saveFormId} disabled={!isDirty || isSaving}>
			{isSaving ? 'Saving…' : 'Save'}
		</Button>
		<Button variant="editor" disabled={needsSave} onclick={() => goto(previewHref(file))}>
			Preview
		</Button>
		<Button variant="editor" disabled={needsSave} onclick={() => goto(publishHref(file))}>
			Publish
		</Button>
		{@render children()}
	</div>
	<div class="status" aria-live="polite">
		<span>
			{#if isSaving}
				Saving…
			{:else if isDirty}
				Unsaved changes
			{:else}
				Saved
			{/if}
		</span>
		{#if isUnpublishing}
			<span>Unpublishing…</span>
		{:else if hasPublishedVersion}
			<a href={publishedHref(file)}>Published</a>
		{:else}
			<span>Unpublished</span>
		{/if}
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
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
	}

	.status {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		margin-left: auto;
	}

	.status a {
		color: inherit;
		text-decoration: underline;
	}
</style>
