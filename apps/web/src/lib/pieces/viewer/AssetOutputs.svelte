<script lang="ts">
	import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
	import { groupAssetOutputs, type OutputFile, type OutputValue } from './assets'
	import { transformCaption, fileType } from './presentation'
	import { toggleDisclosure } from './disclosure'
	import SourceContent from './SourceContent.svelte'
	let {
		assets,
		fileUrl,
		heading = 'Outputs'
	}: {
		assets: PublicWebPieceAsset[]
		fileUrl: (path: string) => string | undefined
		heading?: string
	} = $props()
	const titleId = $props.id()
	const grouped = $derived(groupAssetOutputs(assets, fileUrl))
	// Presentation ordinals follow root input order, even for file/value subsets.
	const ordinalMap = $derived.by(() => {
		const ordinals = new Map<string, number>()
		for (const asset of assets) {
			if (!ordinals.has(asset.asset_key)) ordinals.set(asset.asset_key, ordinals.size + 1)
		}
		return ordinals
	})

	function assetLabel(key: string) {
		return `Asset ${ordinalMap.get(key)}`
	}

	function groupByKey<T extends { key: string }>(items: T[]) {
		const groups = new Map<string, T[]>()
		for (const item of items) {
			const group = groups.get(item.key)
			if (group) group.push(item)
			else groups.set(item.key, [item])
		}
		return Array.from(groups, ([key, items]) => ({ key, items })).sort(
			(first, second) => ordinalMap.get(first.key)! - ordinalMap.get(second.key)!
		)
	}
	type OutputRow = OutputFile | OutputValue
	// Keep projected model identities as row and disclosure keys.
	const families = $derived(
		grouped.transforms.map((transform) => ({
			name: transform.name,
			groups: groupByKey<OutputRow>([...transform.files, ...transform.values])
		}))
	)
	let expanded = $state.raw<Set<OutputValue>>(new Set())
	$effect(() => {
		// A new grouped model replaces the row identities (including replaced preview jobs).
		void grouped
		expanded = new Set<OutputValue>()
	})

	function toggle(value: OutputValue) {
		expanded = toggleDisclosure(expanded, value)
	}
	// Explicit roles retain table semantics in Safari when mobile CSS changes display.
	const roles = { table: 'table', rowgroup: 'rowgroup', row: 'row' } as const
</script>

{#snippet groupHeading(key: string, columns: number)}
	<tr role={roles.row}>
		<th scope="rowgroup" role="rowheader" colspan={columns} class="group-heading"
			>{assetLabel(key)}</th
		>
	</tr>
{/snippet}

{#snippet fileValue(file: OutputFile)}
	{#if file.path != null}
		{#if file.url}
			<div class="cell-value">
				<a
					href={file.url}
					aria-label={`View ${file.label}: ${file.path}`}
					title={file.path}
					target="_blank"
					rel="noopener noreferrer">View</a
				>
			</div>
		{:else}
			<div class="cell-value">
				<span class="truncated" title={`${file.label}: ${file.path}`}>
					<bdi dir="ltr">{file.path}</bdi>
				</span>
				<small class="unavailable" title="No usable file link">Unavailable</small>
			</div>
		{/if}
	{:else}
		<span class="cell-value" title={file.label}>Not recorded</span>
	{/if}
{/snippet}

<section aria-labelledby={titleId}>
	<h2 id={titleId}>{heading}</h2>
	{#if !grouped.transforms.length}<span class="empty">None recorded</span>{/if}
	{#each families as family, familyIndex (family.name)}
		<div class="table-section">
			<table role={roles.table}>
				<caption>{transformCaption(family.name)}</caption>
				<thead role={roles.rowgroup}>
					<tr role={roles.row}>
						<th scope="col" role="columnheader">Output</th>
						<th scope="col" role="columnheader">Field</th>
						<th scope="col" role="columnheader">Type</th>
						<th scope="col" role="columnheader">Value</th>
					</tr>
				</thead>
				{#each family.groups as group, groupIndex (group.key)}
					<tbody role={roles.rowgroup}>
						{#if family.groups.length > 1}{@render groupHeading(group.key, 4)}{/if}
						{#each group.items as row, rowIndex (row)}
							{@const output = 'path' in row ? row.label : row.output}
							{@const field = 'path' in row ? 'File' : row.field}
							{@const context = `${transformCaption(output)}: ${assetLabel(group.key)}, ${field}`}
							{@const sourceId = `${titleId}-source-${familyIndex}-${groupIndex}-${rowIndex}`}
							<tr role={roles.row}>
								<th scope="row" role="rowheader">
									<span class="cell-label" aria-hidden="true">Output</span>
									<span class="cell-value truncated" title={output}
										><bdi dir="ltr">{output}</bdi></span
									>
								</th>
								<td role="cell">
									<span class="cell-label" aria-hidden="true">Field</span>
									<span class="cell-value truncated" title={field}
										><bdi dir="ltr">{field}</bdi></span
									>
								</td>
								<td role="cell" class="file-type">
									<span class="cell-label" aria-hidden="true">Type</span>
									<span class="cell-value truncated" title={row.mime}
										><bdi dir="ltr">{fileType(row.mime)}</bdi></span
									>
								</td>
								<td role="cell">
									<span class="cell-label" aria-hidden="true">Value</span>
									{#if 'path' in row}
										{@render fileValue(row)}
									{:else if row.value === null}
										<span class="cell-value" title={row.mime}>Not recorded</span>
									{:else if row.value === ''}
										<span class="cell-value" title={row.mime}>Empty</span>
									{:else}
										<button
											type="button"
											aria-label={`${expanded.has(row) ? 'Hide' : 'Show'} ${context}`}
											aria-expanded={expanded.has(row)}
											aria-controls={sourceId}
											onclick={() => toggle(row)}>{expanded.has(row) ? 'Hide' : 'Show'}</button
										>
									{/if}
								</td>
							</tr>
							{#if !('path' in row) && row.value !== null && row.value !== ''}
								<tr role={roles.row} id={sourceId} class="source-row" hidden={!expanded.has(row)}>
									<td role="cell" colspan="4" class="source-cell">
										{#if expanded.has(row)}
											<SourceContent value={row} label={context} />
										{/if}
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				{/each}
			</table>
		</div>
	{/each}
</section>

<style>
	section,
	.table-section,
	table,
	caption,
	thead,
	tbody,
	tr,
	th,
	td,
	.cell-value,
	.truncated {
		min-width: 0;
		box-sizing: border-box;
	}
	section,
	.table-section,
	table {
		width: 100%;
	}
	h2 {
		font-size: var(--font-size-normal);
		margin-block: var(--space-6) var(--space-3);
	}
	.table-section {
		margin-block: var(--space-3);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-medium);
		background: var(--color-surface-container-low);
		color: var(--color-on-surface);
	}
	table {
		table-layout: fixed;
		border-collapse: collapse;
		font-size: var(--font-size-xs);
	}
	caption {
		padding: var(--space-2) var(--space-3);
		text-align: left;
		font-weight: var(--font-weight-bold);
		overflow-wrap: anywhere;
	}
	thead {
		background: var(--color-surface-container);
	}
	th,
	td {
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-outline-variant);
		text-align: left;
		vertical-align: top;
		overflow-wrap: anywhere;
	}
	th {
		font-weight: var(--font-weight-medium);
	}
	.group-heading,
	.file-type,
	.empty,
	.unavailable,
	.cell-label {
		color: var(--color-on-surface-variant);
	}
	.cell-label {
		display: none;
	}
	.empty {
		font-size: var(--font-size-xs);
	}
	.unavailable {
		font-size: inherit;
	}
	a {
		color: var(--color-primary);
	}
	button {
		font: inherit;
		font-weight: var(--font-weight-normal);
		color: var(--color-primary);
		background: var(--color-surface-container);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-small);
		padding: var(--space-1) var(--space-2);
		cursor: pointer;
	}
	button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	/* Override mobile row display too: collapsed IDREF targets remain in the DOM. */
	[hidden] {
		display: none !important;
	}

	/* Clip the beginning, but keep the raw value's visual and accessible order. */
	.truncated {
		display: block;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		direction: rtl;
		text-align: left;
	}
	@media (max-width: 600px) {
		table,
		caption,
		tbody {
			display: block;
			width: 100%;
		}
		/* Keep the column headers accessible when the rows become field cards. */
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		tbody > tr {
			display: block;
			width: 100%;
			padding: 0;
			border-top: 1px solid var(--color-outline-variant);
		}
		tbody > tr > th,
		tbody > tr > td {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
			gap: var(--space-2);
			width: 100%;
			padding: var(--space-2) var(--space-3);
			border: 0;
			align-items: start;
		}
		tbody > tr > td.source-cell {
			display: block;
			width: 100%;
			padding: var(--space-2) var(--space-3);
		}
		.cell-label {
			display: block;
			min-width: 0;
		}
		tbody > tr > th.group-heading {
			display: block;
			padding: var(--space-2) var(--space-3);
		}
	}
</style>
