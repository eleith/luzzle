<script lang="ts">
	import MarkdownEditor from '$lib/components/editor/MarkdownEditor.svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import PieceActions from '$lib/components/editor/PieceActions.svelte'
	import type { PageProps } from './$types'

	import { page } from '$app/state'

	let { data, form }: PageProps = $props()

	let dialog: HTMLDialogElement

	let rawContent = $state<string>(
		(form && 'rawContent' in form ? (form.rawContent as string) : undefined) ||
			data.rawContent ||
			''
	)

	const isDirty = $derived(!!form?.error || rawContent !== data.rawContent)

	$effect(() => {
		if (form && 'rawContent' in form && form.rawContent) {
			rawContent = form.rawContent as string
		} else {
			rawContent = data.rawContent || ''
		}
	})
</script>

<dialog bind:this={dialog}>
	<form method="post" action="/admin/piece/{data.file}?/delete">
		<p>Are you sure you want to delete this piece?</p>
		<p>This action cannot be undone.</p>
		<div
			style="display:flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4);"
		>
			<Button variant="outline" onclick={() => dialog.close()}>cancel</Button>
			<Button variant="error" type="submit">delete</Button>
		</div>
	</form>
</dialog>

<div class="piece-page">
	<div class="header">
		<div style="display:flex; gap: var(--space-2);">
			<form method="post">
				<input type="hidden" name="content" value={rawContent} />
				<Button type="submit" disabled={!isDirty}>save</Button>
			</form>
			<a href="/admin/directory/{data.directory === '.' ? '' : data.directory}">
				<Button variant="outline">cancel</Button>
			</a>
		</div>
		<PieceActions
			file={data.file}
			currentMode="source"
			{isDirty}
			canGenerate={data.canGenerate}
			onDelete={() => dialog.showModal()}
		/>
	</div>

	{#if form?.error}
		<div class="error-banner">
			<strong>Error:</strong>
			{form.error.message}
		</div>
	{/if}

	<div class="editor-container">
		<MarkdownEditor
			bind:value={rawContent}
			file={data.file}
			returnTo={page.url.pathname}
			assetFields={data.assetFields}
		/>
	</div>
</div>

<style>
	.piece-page {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.header {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.error-banner {
		padding: var(--space-3);
		background-color: var(--color-error-container);
		color: var(--color-on-error-container);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-small);
		margin-bottom: var(--space-2);
	}

	dialog {
		position: fixed;
		transform: translate(-50%, -50%);
		top: 50%;
		left: 50%;
		border: 1px solid var(--color-outline);
		background-color: var(--color-surface);
		color: var(--color-on-surface);
		padding: var(--space-6);
		border-radius: var(--radius-medium);
		box-shadow: var(--shadow-raised);
	}

	dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
	}

	@media screen and (min-width: 768px) {
		.piece-page {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
