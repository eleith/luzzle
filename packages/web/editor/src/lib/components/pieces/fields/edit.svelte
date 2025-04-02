<script lang="ts">
	import { type PieceFrontmatterSchemaField } from '@luzzle/core'
	import EditAsset from './editAsset.svelte'
	import type { AssetField, EnumField } from './types.js'

	type Props = {
		field: PieceFrontmatterSchemaField
		value: unknown
	}

	let { field, value }: Props = $props()
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
</script>

{#snippet fieldBooleanSnippet(value: unknown, field: PieceFrontmatterSchemaField)}
	<select name="{prefix}.{field.name}" value={value ? 1 : 0} required={field.nullable} >
		<option value="1">true</option>
		<option value="0">false</option>
	</select>
{/snippet}

{#snippet fieldDateSnippet(value: unknown, field: PieceFrontmatterSchemaField)}
	<input
		type="date"
		name="{prefix}.{field.name}"
		value={formatDateStringForInput(value as string) || ''}
required={field.nullable} 
	/>
{/snippet}

{#snippet fieldIntegerSnippet(value: unknown, field: PieceFrontmatterSchemaField)}
	<input type="number" name="{prefix}.{field.name}" {value} required={field.nullable} />
{/snippet}

{#snippet fieldTextSnippet(value: unknown, field: PieceFrontmatterSchemaField)}
	<input type="text" name="{prefix}.{field.name}" {value} required={field.nullable} />
{/snippet}

{#snippet fieldEnumSnippet(value: unknown, field: EnumField)}
	<select name="{prefix}.{field.name}" {value} required={field.nullable}>
		{#if field.enum}
			{#each field.enum as option}
				<option value={option}>{option}</option>
			{/each}
		{/if}
	</select>
{/snippet}

<div>
	{#if isAsset(field)}
		<EditAsset {field} {value} />
	{:else if field.format === 'date'}
		{@render fieldDateSnippet(value, field)}
	{:else if field.type === 'integer'}
		{@render fieldIntegerSnippet(value, field)}
	{:else if field.type === 'boolean'}
		{@render fieldBooleanSnippet(value, field)}
	{:else if isEnum(field)}
		{@render fieldEnumSnippet(value, field)}
	{:else}
		{@render fieldTextSnippet(value, field)}
	{/if}
</div>

<style>
</style>
