<script lang="ts">
	import { type PieceFrontmatterSchemaField } from '@luzzle/core'
	import EditAsset from './editAsset.svelte'
	import type { AssetField, EnumField } from './types.js'

	type Props = {
		field: PieceFrontmatterSchemaField
		value: unknown
		originalValue?: unknown
	}

	let { field, value = $bindable(), originalValue }: Props = $props()
	let inputElement: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | EditAsset | null =
		$state(null)
	let assetModified = $state(false)

	function normalize(v: unknown) {
		return v === undefined || v === null ? '' : v
	}

	const isModified = $derived(
		isAsset(field)
			? assetModified
			: JSON.stringify(normalize(value)) !== JSON.stringify(normalize(originalValue))
	)

	const prefix = 'frontmatter'

	function isEnum(field: PieceFrontmatterSchemaField): field is EnumField {
		return field.enum !== undefined
	}

	function isAsset(field: PieceFrontmatterSchemaField): field is AssetField {
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
		} catch (error) {
			console.log(error)
			return null
		}
	}

	export function focus() {
		if (inputElement) {
			inputElement.focus()
		}
	}
</script>

{#snippet fieldBooleanSnippet(field: PieceFrontmatterSchemaField)}
	<select
		name="{prefix}.{field.name}"
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
		name="{prefix}.{field.name}"
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
		name="{prefix}.{field.name}"
		bind:value
		required={!field.nullable}
		bind:this={inputElement}
	/>
{/snippet}

{#snippet fieldTextSnippet(field: PieceFrontmatterSchemaField)}
	<input
		type="text"
		class="input"
		name="{prefix}.{field.name}"
		bind:value
		required={!field.nullable}
		bind:this={inputElement}
	/>
{/snippet}

{#snippet fieldParagraphSnippet(field: PieceFrontmatterSchemaField)}
	<textarea
		name="{prefix}.{field.name}"
		class="input"
		required={!field.nullable}
		bind:this={inputElement}
		bind:value>{value}</textarea
	>
{/snippet}

{#snippet fieldEnumSnippet(field: EnumField)}
	<select
		name="{prefix}.{field.name}"
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

<div class="field" class:modified={isModified}>
	{field.name}{isModified ? ' (edited)' : ''}
</div>

<div class="field-container">
	{#if isAsset(field)}
		<div>
			<EditAsset {field} {value} {originalValue} bind:isModified={assetModified} />
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
		color: var(--color-primary); /* Adapted from --colors-primary */
	}

	input[type='text'] {
		width: 100%;
	}

	textarea {
		width: 100%;
	}
</style>
