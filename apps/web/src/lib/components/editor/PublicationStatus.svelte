<script lang="ts">
	import type { EditorPublicationStatus } from '#lib/pieces/types.js'

	type Props = {
		status: EditorPublicationStatus
		hasPublishedVersion: boolean
		isDirty: boolean
		isSaving: boolean
	}
	let { status, hasPublishedVersion, isDirty, isSaving }: Props = $props()
</script>

<span class="editor-publication-status" data-state={status} role="status">
	{#if status === 'unknown'}Status unavailable
	{:else if status === 'publishing'}Publishing…
	{:else if status === 'unpublishing'}Unpublishing…
	{:else if isSaving}Saving…
	{:else if isDirty}Unsaved
	{:else if status === 'changed'}Saved changes
	{:else if hasPublishedVersion}Up to date
	{:else}Unpublished{/if}
</span>

<style>
	.editor-publication-status {
		display: block;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font: inherit;
	}
</style>
