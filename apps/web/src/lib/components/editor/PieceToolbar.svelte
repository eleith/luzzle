<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { EditorPublicationStatus } from '#lib/pieces/types.js'
	import Button from '#lib/components/ui/Button.svelte'

	type Props = {
		saveFormId: string
		isDirty: boolean
		isSaving: boolean
		publishDisabled: boolean
		publicationStatus: EditorPublicationStatus
		onPublish: () => void
		children: Snippet
	}

	let {
		saveFormId,
		isDirty,
		isSaving,
		publishDisabled,
		publicationStatus,
		onPublish,
		children
	}: Props = $props()
	const isPublishing = $derived(publicationStatus === 'publishing')
</script>

<div class="toolbar" role="group" aria-label="Editor actions">
	<div class="actions">
		<span class="save-action" class:clean={!isDirty && !isSaving}>
			<Button variant="editor" type="submit" form={saveFormId} disabled={!isDirty || isSaving}>
				{#if isSaving}Saving…{:else if isDirty}Save{:else}Saved{/if}
			</Button>
		</span>
		{#if publicationStatus !== 'published' && publicationStatus !== 'unpublishing'}
			<span class="publish-action" class:deferred={(isDirty || isSaving) && !isPublishing}>
				<Button variant="editor" type="button" onclick={onPublish} disabled={publishDisabled}>
					{#if isPublishing}Publishing…{:else}Publish{/if}
				</Button>
			</span>
		{/if}
		{@render children()}
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-mono-name), monospace;
		font-size: var(--font-size-xxs);
	}
	.actions {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		gap: var(--space-1);
	}
	.save-action,
	.publish-action {
		display: contents;
	}
	@media (max-width: 767px) {
		.toolbar {
			gap: var(--space-2);
			padding-inline: var(--space-2);
		}
		.save-action.clean,
		.publish-action.deferred {
			display: none;
		}
	}
</style>
