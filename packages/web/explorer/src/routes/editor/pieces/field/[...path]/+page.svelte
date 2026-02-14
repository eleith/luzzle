<script lang="ts">
	import type { PageData, ActionData } from './$types'
	import Edit from '$lib/components/editor/fields/edit.svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import { goto } from '$app/navigation'
	import { Select } from 'bits-ui'
	import CaretDown from 'virtual:icons/ph/caret-down'
	import Check from 'virtual:icons/ph/check'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	let selectedPath = $state(data.targetPath || '')
	let isModified = $state(false)

	function onValueChange(value: string | string[] | undefined) {
		if (typeof value === 'string' && value) {
			goto(`/editor/pieces/field/${data.file}?path=${value}`)
		}
	}
</script>

<section class="field-editor">
	{#if form?.error}
		<div class="error" style="color:var(--color-error); margin-bottom: var(--space-4);">
			{form.error.message}
		</div>
	{/if}

	<div class="field-selector">
		<label for="path-select">Field to Edit:</label>
		<div class="select-wrapper">
			<Select.Root type="single" bind:value={selectedPath} {onValueChange}>
				<Select.Trigger id="path-select">
					{#snippet child({ props })}
						<button {...props} class="select-trigger">
							{selectedPath || 'Select a field...'}
							<CaretDown />
						</button>
					{/snippet}
				</Select.Trigger>
				<Select.Portal>
					<Select.Content sideOffset={-3} side="bottom" align="start">
						{#snippet child({ props, wrapperProps })}
							<div {...wrapperProps}>
								<div {...props} class="select-content">
									<Select.Viewport class="select-viewport">
										{#each data.paths as path (path)}
											<Select.Item value={path} label={path}>
												{#snippet child({ props })}
													<div {...props} class="select-item">
														{path}
														<span class="select-indicator">
															<Check />
														</span>
													</div>
												{/snippet}
											</Select.Item>
										{/each}
									</Select.Viewport>
								</div>
							</div>
						{/snippet}
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</div>
	</div>

	{#if data.targetSchema && selectedPath}
		{#key selectedPath}
			<form method="post" action="?path={selectedPath}" enctype="multipart/form-data">
				<div class="editor-content">
					<Edit
						field={data.targetSchema}
						value={data.targetValue}
						originalValue={data.targetValue}
						bind:isModified
						pathPrefix="frontmatter"
					/>

					<div class="actions">
						<Button type="submit" disabled={!isModified}>Save</Button>
						<a href="/editor/piece/{data.file}">
							<Button variant="outline">Cancel</Button>
						</a>
					</div>
				</div>
			</form>
		{/key}
	{:else if selectedPath}
		<div class="empty-state">
			Field schema not found for <code>{selectedPath}</code>.
		</div>
	{/if}
</section>

<style>
	section.field-editor {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.field-selector {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.select-wrapper {
		position: relative;
		width: 100%;
	}

	.select-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0;
		padding-left: 12px;
		padding-right: 6px;
		background: var(--color-surface-container-highest);
		border: 3px solid var(--color-surface-inverse);
		color: var(--color-on-surface);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		font-size: 16px;
		height: 50px;
		box-sizing: border-box;
		outline: none;
	}

	.select-trigger :global(svg) {
		color: var(--color-on-surface);
		flex-shrink: 0;
		display: block;
	}

	.select-trigger[data-state='open'],
	.select-trigger:focus {
		background: var(--color-surface-inverse);
		color: var(--color-on-surface-inverse);
	}

	.select-trigger[data-state='open'] :global(svg),
	.select-trigger:focus :global(svg) {
		color: var(--color-on-surface-inverse);
	}

	.select-content {
		background-color: var(--color-surface-container-highest);
		border: 3px solid var(--color-surface-inverse);
		box-shadow: var(--shadow-raised);
		z-index: 1000;
		width: var(--bits-select-anchor-width);
		box-sizing: border-box;
	}

	.select-viewport {
		padding: var(--space-1);
	}

	.select-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		cursor: pointer;
		color: var(--color-on-surface);
		outline: none;
		position: relative;
		font-size: 16px;
	}

	.select-item[data-highlighted] {
		background: var(--color-surface-inverse);
		color: var(--color-on-surface-inverse);
	}

	.select-indicator {
		display: none;
		align-items: center;
		justify-content: center;
	}

	.select-item[data-selected] .select-indicator {
		display: flex;
	}

	.editor-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.actions {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-4);
		justify-content: flex-end;
	}

	@media screen and (min-width: 768px) {
		section.field-editor {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}
</style>
