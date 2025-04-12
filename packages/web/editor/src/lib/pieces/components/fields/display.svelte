<script lang="ts">
	import { type PieceFrontmatterSchemaField } from '@luzzle/cli'

	type Props = {
		field: PieceFrontmatterSchemaField
		value: unknown
		undefinedValue?: string
	}

	let { field, value, undefinedValue = 'empty' }: Props = $props()

	const format = field.format
	const type = field.type
</script>

{#snippet oneField(
	value: unknown,
	type: Omit<PieceFrontmatterSchemaField['type'], 'array'>,
	format: PieceFrontmatterSchemaField['format']
)}
	{#if value === undefined}
		<em>{undefinedValue}</em>
	{:else if format === 'asset'}
		<a href="/asset/{value}">{value}</a>
	{:else if type === 'boolean'}
		<span>{value ? 'true' : 'false'}</span>
	{:else}
		<span>{value}</span>
	{/if}
{/snippet}

<div>
	{#if type === 'array'}
		{#each value as unknown[] as one}
			{#if field.items.type !== 'array'}
				{@render oneField(one, field.items.type, field.items.format)}
			{/if}
		{/each}
	{:else if type === 'string' || type === 'integer' || type === 'boolean'}
		{@render oneField(value, type, format)}
	{/if}
</div>

<style>
</style>
