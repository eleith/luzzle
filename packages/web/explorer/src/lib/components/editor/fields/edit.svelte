<script lang="ts">
	import type { PieceFrontmatterSchemaField, PieceFrontmatterProperty } from '@luzzle/core'
	import EditAsset from './editAsset.svelte'
	import Edit from './edit.svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import { isFieldEqual } from '$lib/utils/comparison'

	type FrontmatterObject = Record<string, unknown>

	type Props = {
		field: PieceFrontmatterSchemaField
		value: unknown
		originalValue?: unknown
		isModified?: boolean
		pathPrefix?: string
	}

	let {
		field,
		value = $bindable(),
		originalValue,
		isModified = $bindable(false),
		pathPrefix = 'frontmatter'
	}: Props = $props()

	let inputElement: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | EditAsset | null =
		$state(null)
	let assetModified = $state(false)
	const currentPath = $derived(`${pathPrefix}.${field.name}`)
	const checkModified = $derived(
		isAsset(field) ? assetModified : !isFieldEqual(value, originalValue)
	)

	$effect(() => {
		isModified = checkModified
	})

	function isEnum(
		field: PieceFrontmatterSchemaField
	): field is PieceFrontmatterSchemaField & { name: string; enum: string[] | number[] } {
		return 'enum' in field && field.enum !== undefined
	}

	function isAsset(
		field: PieceFrontmatterSchemaField
	): field is PieceFrontmatterSchemaField & { name: string; format: 'asset' } {
		return field.format === 'asset' || (field.type === 'array' && field.items.format === 'asset')
	}

	function formatDateStringForInput(dateString: string): string | null {
		if (!dateString) {
			return null
		}

		try {
			const date = new Date(dateString)

			if (isNaN(date.getTime())) {
				return null // Invalid date
			}

			const year = date.getUTCFullYear()
			const month = String(date.getUTCMonth() + 1).padStart(2, '0')
			const day = String(date.getUTCDate()).padStart(2, '0')

			return `${year}-${month}-${day}`
		} catch {
			return null
		}
	}

	export function focus() {
		if (inputElement) {
			inputElement.focus()
		}
	}

	function getSubFields(property: PieceFrontmatterProperty): Array<PieceFrontmatterSchemaField> {
		if (property.type === 'object') {
			return Object.keys(property.properties).map((name) => ({
				...property.properties[name],
				name,
				nullable:
					property.required?.includes(name) === false ||
					((property.properties[name] as Record<string, unknown>).nullable as
						| boolean
						| undefined) === true
			}))
		}
		return []
	}

	/**
	 * Client-safe initialization of empty values.
	 * Avoids importing complex initialization logic from Core.
	 */
	function createEmptyValue(prop: PieceFrontmatterProperty) {
		if (prop.type === 'object') {
			const obj: Record<string, unknown> = {}
			// We only initialize required fields or leave it empty for user to build
			return obj
		}
		if (prop.type === 'array') return []
		if (prop.type === 'boolean') return false
		if (prop.type === 'integer') return 0
		return ''
	}

	function addItem() {
		if (field.type === 'array') {
			const newItem = createEmptyValue(field.items)
			if (!Array.isArray(value)) {
				value = [newItem]
			} else {
				value = [...value, newItem]
			}
		} else if (field.type === 'object') {
			value = {}
		}
	}

	function removeItem(index?: number) {
		if (field.type === 'array' && index !== undefined && Array.isArray(value)) {
			value = value.filter((_, i) => i !== index)
		} else if (field.type === 'object') {
			value = undefined
		}
	}
</script>

{#snippet fieldBooleanSnippet(field: PieceFrontmatterSchemaField)}
	<select
		name={currentPath}
		class="input"
		value={value ? '1' : '0'}
		onchange={(e) => (value = e.currentTarget.value === '1')}
		required={!field.nullable}
	>
		<option value="1">true</option>
		<option value="0">false</option>
	</select>
{/snippet}

{#snippet fieldDateSnippet(field: PieceFrontmatterSchemaField)}
	<input
		type="date"
		class="input"
		name={currentPath}
		value={formatDateStringForInput(value as string) || ''}
		onchange={(e) => (value = e.currentTarget.value)}
		required={!field.nullable}
		bind:this={inputElement}
	/>
{/snippet}

{#snippet fieldIntegerSnippet(field: PieceFrontmatterSchemaField)}
	<input
		type="number"
		class="input"
		name={currentPath}
		bind:value
		required={!field.nullable}
		bind:this={inputElement}
	/>
{/snippet}

{#snippet fieldTextSnippet(field: PieceFrontmatterSchemaField)}
	<input
		type="text"
		class="input"
		name={currentPath}
		bind:value
		required={!field.nullable}
		bind:this={inputElement}
	/>
{/snippet}

{#snippet fieldParagraphSnippet(field: PieceFrontmatterSchemaField)}
	<textarea
		name={currentPath}
		class="input"
		required={!field.nullable}
		bind:this={inputElement}
		bind:value
	></textarea>
{/snippet}

{#snippet fieldEnumSnippet(
	field: PieceFrontmatterSchemaField & { name: string; enum: string[] | number[] }
)}
	<select
		name={currentPath}
		class="input"
		bind:value
		required={!field.nullable}
		bind:this={inputElement}
	>
		{#if field.enum}
			{#each field.enum as option, index (index)}
				<option value={option}>{option}</option>
			{/each}
		{/if}
	</select>
{/snippet}

{#snippet fieldObjectSnippet(field: PieceFrontmatterSchemaField)}
	<div class="nested-fields">
		{#if value !== null && typeof value === 'object'}
			<div class="field-actions">
				<Button
					variant="error"
					onclick={() => removeItem()}
					style="font-size: 0.6rem; padding: 2px 4px; min-height: auto;"
				>
					remove object
				</Button>
			</div>
			{#each getSubFields(field) as subField (subField.name)}
				{@const record = value as FrontmatterObject}
				{@const originalRecord = originalValue as FrontmatterObject | undefined}
				<Edit
					field={subField}
					bind:value={record[subField.name]}
					originalValue={originalRecord && typeof originalRecord === 'object'
						? originalRecord[subField.name]
						: undefined}
					pathPrefix={currentPath}
				/>
			{/each}
		{:else}
			<input
				type="hidden"
				name="frontmatter.remove.{currentPath.replace(/^frontmatter\./, '')}"
				value="true"
			/>
			<Button variant="tertiary" onclick={addItem} style="font-size: 0.8rem; padding: 4px 8px;">
				+ Add {field.name}
			</Button>
		{/if}
	</div>
{/snippet}

{#snippet fieldArraySnippet(field: PieceFrontmatterSchemaField)}
	<div class="nested-fields">
		{#if Array.isArray(value)}
			<!-- Clear array before re-populating to handle item removals -->
			<input
				type="hidden"
				name="frontmatter.remove.{currentPath.replace(/^frontmatter\./, '')}"
				value="true"
			/>

			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
			{#each value as _, index (index)}
				<div class="array-item">
					<div class="array-header">
						<span>Item {index}</span>
						<Button
							variant="error"
							onclick={() => removeItem(index)}
							style="font-size: 0.6rem; padding: 2px 4px; min-height: auto;"
						>
							remove
						</Button>
					</div>
					{#if field.type === 'array' && field.items.type === 'object'}
						{#each Object.keys(field.items.properties) as subName (subName)}
							<Edit
								field={{
									...field.items.properties[subName],
									name: subName,
									nullable: true
								}}
								bind:value={value[index][subName]}
								originalValue={Array.isArray(originalValue) && originalValue[index]
									? originalValue[index][subName]
									: undefined}
								pathPrefix="{currentPath}.{index}"
							/>
						{/each}
					{:else if field.type === 'array'}
						<Edit
							field={{ ...field.items, name: index.toString(), nullable: true }}
							bind:value={value[index]}
							originalValue={Array.isArray(originalValue)
								? (originalValue as unknown[])[index]
								: undefined}
							pathPrefix={currentPath}
						/>
					{/if}
				</div>
			{/each}
		{/if}
		<Button variant="tertiary" onclick={addItem} style="font-size: 0.8rem; padding: 4px 8px;">
			+ Add Item to {field.name}
		</Button>
	</div>
{/snippet}

<div class="field" class:modified={checkModified}>
	{field.name}{checkModified ? ' (edited)' : ''}
</div>

<div class="field-container">
	{#if isAsset(field)}
		<div>
			<EditAsset {field} {value} {originalValue} bind:isModified={assetModified} {pathPrefix} />
		</div>
	{:else if field.format === 'date'}
		{@render fieldDateSnippet(field)}
	{:else if field.type === 'integer'}
		{@render fieldIntegerSnippet(field)}
	{:else if field.type === 'boolean'}
		{@render fieldBooleanSnippet(field)}
	{:else if isEnum(field)}
		{@render fieldEnumSnippet(field)}
	{:else if field.format === 'paragraph'}
		{@render fieldParagraphSnippet(field)}
	{:else if field.type === 'object'}
		{@render fieldObjectSnippet(field)}
	{:else if field.type === 'array'}
		{@render fieldArraySnippet(field)}
	{:else}
		{@render fieldTextSnippet(field)}
	{/if}
</div>

<style>
	.field {
		font-size: 80%;
		padding-bottom: 5px;
	}

	.modified {
		color: var(--color-primary);
	}

	.nested-fields {
		border-left: 2px solid var(--color-border);
		padding-left: 1rem;
		margin-bottom: 1rem;
	}

	.array-item {
		border-bottom: 1px dashed var(--color-border);
		padding-bottom: 1rem;
		margin-bottom: 1rem;
	}

	.array-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 70%;
		text-transform: uppercase;
		opacity: 0.6;
		margin-bottom: 0.5rem;
	}

	.field-actions {
		margin-bottom: 0.5rem;
	}

	input[type='text'] {
		width: 100%;
	}

	textarea {
		width: 100%;
	}
</style>
