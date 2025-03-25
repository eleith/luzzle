<script lang="ts">
	import { type PieceFrontmatterSchemaField } from '@luzzle/core'

	type Props = {
		field: PieceFrontmatterSchemaField
		value: unknown
		prefix?: {
			upload: string
			input: string
		}
		inputPrefix?: string
		uploadPrefix?: string
	}

	let { field, value, prefix = { upload: 'upload', input: 'frontmatter' } }: Props = $props()
	const type = field.type

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

{#snippet oneField(value: unknown, field: PieceFrontmatterSchemaField)}
	{#if field.format === 'asset'}
		<input type="file" name="{prefix.upload}.{field.name}" />
		<input type="hidden" name="{prefix.input}.{field.name}" {value} />
	{:else if field.format === 'date'}
		<input
			type="date"
			name="{prefix.input}.{field.name}"
			value={formatDateStringForInput(value as string) || ''}
		/>
	{:else if field.type === 'integer'}
		<input type="number" name="{prefix.input}.{field.name}" {value} />
	{:else if field.type === 'boolean'}
		<select name="{prefix.input}.{field.name}" value={value ? 1 : 0}>
			<option value="1">true</option>
			<option value="0">false</option>
		</select>
	{:else if field.enum}
		<select name="{prefix.input}.{field.name}" {value}>
			{#each field.enum as option}
				<option value={option}>{option}</option>
			{/each}
		</select>
	{:else}
		<input type="text" name="{prefix.input}.{field.name}" {value} />
	{/if}
{/snippet}

<div>
	{#if type === 'array'}
		{#each value as unknown[] as one, i}
			{#if field.items.type !== 'array'}
				{@render oneField(one, {
					...field.items,
					name: `${field.name}[${i}]`
				} as PieceFrontmatterSchemaField)}
			{/if}
		{/each}
	{:else if type === 'string' || type === 'integer' || type === 'boolean'}
		{@render oneField(value, field)}
	{/if}
</div>

<style>
</style>
