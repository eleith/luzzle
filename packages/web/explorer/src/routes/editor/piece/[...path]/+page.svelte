<script lang="ts">
	import PieceForm from '$lib/components/editor/PieceForm.svelte'
	import PieceActions from '$lib/components/editor/PieceActions.svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import { goto } from '$app/navigation'
	import type { PageProps } from './$types'

	let { data, form }: PageProps = $props()
	let dialog: HTMLDialogElement
	let fields = $state(form?.fields || data.fields)
	let note = $state(form?.note || data.note || '')
	let formDirty = $state(!!form?.error)

	$effect(() => {
		if (form?.fields) {
			fields = form.fields
			note = form.note || ''
			formDirty = true
		} else {
			fields = data.fields
			note = data.note || ''
			formDirty = false
		}
	})

	const isDirty = $derived(formDirty)
</script>

<dialog bind:this={dialog}>
	<form method="post" action="?/delete">
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

{#snippet buttons()}
	<div style="display:flex; gap: var(--space-2);">
		{#if isDirty}
			<Button type="submit" form="piece-form">save</Button>
		{:else}
			<Button disabled={true}>save</Button>
		{/if}
		<a href={data.directory === '.' ? '/editor/directory' : `/editor/directory/${data.directory}`}>
			<Button variant="outline">cancel</Button>
		</a>
	</div>

	<PieceActions
		file={data.file}
		currentMode="form"
		{isDirty}
		canGenerate={data.canGenerate}
		onDelete={() => dialog.showModal()}
	/>
{/snippet}

<div class="piece-page">
	{#if form?.error}
		<div class="error-banner">
			<strong>Error:</strong>
			{form.error.message}
		</div>
	{/if}

	{#if data.isTooComplex}
		<div class="warning-banner">
			<strong>Complex Structure:</strong> This piece contains deeply nested fields that cannot be
			edited in the simplified Form view. Please use Source Mode or the Field Editor.
			<div style="margin-top: var(--space-2);">
				<Button onclick={() => goto(`/editor/piece/${data.file}/source`)}>
					Switch to Source Mode
				</Button>
			</div>
		</div>
	{:else}
		{#key data.file}
			<PieceForm
				id="piece-form"
				action="?/edit"
				schema={data.schema}
				values={fields}
				originalValues={data.fields}
				bind:note
				originalNote={data.note}
				{buttons}
				bind:isModified={formDirty}
			/>
		{/key}
	{/if}
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

	.error-banner {
		padding: var(--space-3);
		background-color: var(--color-error-container);
		color: var(--color-on-error-container);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-small);
		margin-bottom: var(--space-2);
	}

	.warning-banner {
		padding: var(--space-4);
		background-color: var(--color-surface-container-high);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-medium);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	@media screen and (min-width: 768px) {
		.piece-page {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
