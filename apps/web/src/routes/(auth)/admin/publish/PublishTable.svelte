<script lang="ts">
	import type { PiecesDiff } from '@luzzle/core'
	import Check from 'virtual:icons/ph/check'
	import X from 'virtual:icons/ph/x'
	import PencilSimple from 'virtual:icons/ph/pencil-simple'
	import {
		editorHref,
		publishedHref,
		selectablePaths as getSelectablePaths,
		toggleSelection,
		type PublicationOutcome
	} from './report.js'

	type Props = {
		diff?: PiecesDiff | null
		outcomes?: PublicationOutcome[]
		order?: string[]
		selectedPaths?: string[]
		publishingPaths?: string[]
		disabled?: boolean
	}

	let {
		diff = null,
		outcomes = [],
		order = [],
		selectedPaths = $bindable([]),
		publishingPaths = [],
		disabled = false
	}: Props = $props()
	let masterCheckbox = $state<HTMLInputElement | undefined>(undefined)

	const pendingRemovals = $derived(new Set(diff?.pieces.pruned ?? []))
	const selectablePaths = $derived.by(() => {
		const paths: string[] = []
		if (!diff) return paths
		for (const file of getSelectablePaths(diff)) {
			if (!pendingRemovals.has(file)) paths.push(file)
		}
		return paths
	})
	const outcomesByPath = $derived.by(() => {
		const latest = new Map<string, PublicationOutcome>()
		for (const outcome of outcomes) latest.set(outcome.filePath, outcome)
		return latest
	})
	const currentMembership = $derived.by(() => {
		const paths = new Set(selectablePaths)
		for (const outcome of outcomesByPath.values()) {
			if (outcome.state === 'removed' || pendingRemovals.has(outcome.filePath)) continue
			paths.add(outcome.filePath)
		}
		return paths
	})
	const displayOrder = $derived.by(() => {
		const paths = new Set<string>()
		for (const file of order) {
			if (currentMembership.has(file)) paths.add(file)
		}
		for (const file of currentMembership) paths.add(file)
		return Array.from(paths)
	})
	const removals = $derived.by(() => {
		const paths = new Set(pendingRemovals)
		for (const outcome of outcomesByPath.values()) {
			if (outcome.state !== 'removed' || selectablePaths.includes(outcome.filePath)) continue
			paths.add(outcome.filePath)
		}
		return Array.from(paths)
	})
	const selectedCount = $derived(
		selectablePaths.filter((file) => selectedPaths.includes(file)).length
	)
	const allSelected = $derived(
		selectablePaths.length > 0 && selectedCount === selectablePaths.length
	)
	const partiallySelected = $derived(selectedCount > 0 && selectedCount < selectablePaths.length)

	$effect(() => {
		if (masterCheckbox) masterCheckbox.indeterminate = partiallySelected
	})
</script>

<div class="publish-table">
	{#if displayOrder.length > 0}
		<section class="pieces" aria-label="Pieces">
			{#if selectablePaths.length > 0}
				<label class="selection-master">
					<input
						bind:this={masterCheckbox}
						type="checkbox"
						checked={allSelected}
						disabled={disabled || selectablePaths.some((file) => publishingPaths.includes(file))}
						onchange={(event) => {
							selectedPaths = event.currentTarget.checked ? [...selectablePaths] : []
						}}
					/>
					<span>Select all</span>
				</label>
			{:else}
				<h3>Pieces</h3>
			{/if}
			<ul>
				{#each displayOrder as file (file)}
					{@const pending = selectablePaths.includes(file)}
					{@const outcome = outcomesByPath.get(file)}
					{@const publishing = publishingPaths.includes(file)}
					{@const failed = outcome?.state === 'failed'}
					{@const published = !pending && outcome?.state === 'published' && !publishing}
					{#snippet details()}
						<span class="piece-details">
							<span class="filename">{file}</span>
							{#if failed && !publishing && outcome?.message}
								<span class="error">{outcome.message}</span>
							{/if}
						</span>
						{#if publishing}
							<span class="badge">Publishing</span>
						{:else if published}
							<a class="badge published-link" href={publishedHref(file)}>Published</a>
						{:else}
							<span class="badge">
								{#if failed}
									Failed
								{:else if diff?.pieces.added.includes(file)}
									New
								{:else}
									Updated
								{/if}
							</span>
						{/if}
					{/snippet}
					<li class="piece-row">
						{#if pending}
							<label class="piece-content piece-selection">
								<input
									type="checkbox"
									checked={selectedPaths.includes(file)}
									disabled={disabled || publishing}
									onchange={(event) => {
										selectedPaths = toggleSelection(
											selectedPaths,
											file,
											event.currentTarget.checked
										)
									}}
								/>
								{@render details()}
							</label>
						{:else}
							<div class="piece-content">
								<span class="result-icon" class:is-error={failed}>
									{#if published}<Check aria-hidden="true" />{:else if failed}<X
											aria-hidden="true"
										/>{/if}
								</span>
								{@render details()}
							</div>
						{/if}
						<a
							class="edit-link"
							href={editorHref(file)}
							aria-label={`Edit ${file}`}
							title={`Edit ${file}`}
						>
							<PencilSimple aria-hidden="true" />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if removals.length > 0}
		<section class="removals" aria-label="Removals">
			<h3>
				{#if pendingRemovals.size > 0}
					Removals · always included
				{:else}
					Removals
				{/if}
			</h3>
			<ul>
				{#each removals as file (file)}
					<li class="removed-row">
						<span class="filename" class:change-gone={!pendingRemovals.has(file)}>{file}</span>
						{#if !pendingRemovals.has(file)}<span class="badge">Removed</span>{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if displayOrder.length === 0 && removals.length === 0}
		<p class="empty">No piece changes.</p>
	{/if}
</div>

<style>
	.publish-table {
		color: var(--color-on-surface);
		font-size: var(--font-size-xs);
		line-height: 1.4;
	}

	.pieces,
	.removals {
		background-color: var(--color-surface-container-lowest);
		border: 1px solid var(--color-outline-variant);
		border-radius: var(--radius-small);
	}

	.removals {
		margin-top: var(--space-3);
	}

	.removals:first-child {
		margin-top: 0;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.selection-master,
	.piece-content {
		box-sizing: border-box;
		display: grid;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		padding: var(--space-2) var(--space-3);
	}

	.selection-master,
	.piece-selection {
		cursor: pointer;
	}

	.selection-master {
		grid-template-columns: 20px minmax(0, 1fr);
	}

	.selection-master,
	h3 {
		background-color: var(--color-surface-container-low);
	}

	.piece-row {
		display: flex;
		align-items: stretch;
		border-top: 1px solid var(--color-outline-variant);
	}

	.piece-content {
		flex: 1;
		min-width: 0;
		grid-template-columns: 20px minmax(0, 1fr) auto;
	}

	input,
	.result-icon {
		width: 20px;
		height: 20px;
		margin: 0;
	}

	.result-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--color-primary);
	}

	input {
		accent-color: var(--color-primary);
		cursor: pointer;
	}

	input:disabled {
		cursor: not-allowed;
	}

	.piece-details {
		min-width: 0;
	}

	.filename {
		min-width: 0;
		font-family: var(--font-mono-name), monospace;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.is-error {
		color: var(--color-error);
	}

	.error {
		display: block;
		color: var(--color-error);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.badge {
		padding: 2px var(--space-1);
		border-radius: var(--radius-small);
		background-color: var(--color-surface-container-high);
		color: var(--color-on-surface-variant);
		font-size: var(--font-size-xxs);
	}

	.published-link {
		color: var(--color-primary);
	}

	.edit-link {
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		min-width: 44px;
		min-height: 44px;
		padding: var(--space-2);
		color: var(--color-primary);
		text-decoration: none;
	}

	.piece-row:focus-within,
	.selection-master:focus-within,
	.piece-selection:hover,
	.edit-link:hover {
		background-color: var(--color-surface-container-low);
	}

	input:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	h3 {
		box-sizing: border-box;
		min-height: 44px;
		display: flex;
		align-items: center;
		margin: 0;
		padding: var(--space-2) var(--space-3);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
	}

	.removed-row {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: 44px;
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-outline-variant);
		color: var(--color-on-surface-variant);
	}

	.change-gone {
		text-decoration: line-through;
	}

	.empty {
		margin: 0;
		color: var(--color-on-surface-variant);
	}
</style>
