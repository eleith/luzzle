<script lang="ts">
	import type { PieceFrontmatterSchemaField } from '@luzzle/core'
	import type { Snippet } from 'svelte'
	import FieldEdit from './fields/edit.svelte'
	import { isFieldEqual } from '$lib/utils/comparison'

	interface Props {
		id?: string
		action: string
		schema: PieceFrontmatterSchemaField[]
		values: Record<string, unknown>
		originalValues?: Record<string, unknown>
		note: string
		originalNote?: string
		buttons: Snippet
		isModified?: boolean
	}

	let {
		id,
		action,
		schema,
		values,
		originalValues,
		note = $bindable(),
		originalNote,
		buttons,
		isModified = $bindable(false)
	}: Props = $props()

	let fieldStates = $state<Record<string, boolean>>(
		Object.fromEntries(schema.map((field) => [field.name, false]))
	)
	const fieldsModified = $derived(Object.values(fieldStates).some((v) => v))
	const noteModified = $derived(!isFieldEqual(note, originalNote))

	$effect(() => {
		isModified = fieldsModified || noteModified
	})
</script>

<section class="edit">
	<form {id} method="post" enctype="multipart/form-data" {action}>
		<div class="piece-container">
			{#each schema as field, index (index)}
				<div class="field-edit">
					<FieldEdit
						{field}
						bind:value={values[field.name]}
						originalValue={originalValues?.[field.name]}
						bind:isModified={fieldStates[field.name]}
					/>
				</div>
			{/each}
			<div class="field" class:modified={noteModified}>
				note{noteModified ? ' (edited)' : ''}
			</div>
			<div class="field-edit">
				<textarea class="input" name="note" style="width: 100%;height:300px;" bind:value={note}
				></textarea>
			</div>
			<div style="display: flex; justify-content: space-between;">
				{@render buttons()}
			</div>
		</div>
	</form>
</section>

<style>
	div.field {
		font-size: 80%;
	}

	.modified {
		color: var(--color-primary);
	}

	div.field-edit {
		padding-bottom: 10px;
	}

	section.edit {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	@media screen and (min-width: 768px) {
		section.edit {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
