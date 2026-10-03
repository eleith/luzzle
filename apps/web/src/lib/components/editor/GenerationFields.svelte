<script lang="ts">
	import { Combobox } from 'bits-ui'
	import { tick } from 'svelte'
	import CaretUpDown from 'virtual:icons/ph/caret-up-down'
	import Check from 'virtual:icons/ph/check-bold'

	type Props = { fields: string[]; selected: string[]; disabled?: boolean }
	let { fields, selected = $bindable([]), disabled = false }: Props = $props()
	const id = $props.id()
	let query = $state('')
	let expanded = $state(false)
	let anchor = $state<HTMLDivElement | null>(null)
	let input = $state<HTMLInputElement | null>(null)
	const matches = $derived(
		fields.filter((field) => field.toLowerCase().includes(query.toLowerCase()))
	)
	const allSelected = $derived(fields.length > 0 && selected.length === fields.length)

	$effect(() => {
		if (disabled) {
			expanded = false
			void clearSearch()
		}
	})

	export function focus() {
		input?.focus()
	}

	async function clearSearch() {
		query = ''
		// Bits UI sets the picked label after onValueChange. Wait, then clear both
		// the displayed text and its internal input state through the normal input event.
		await tick()
		if (!input?.isConnected) return
		input.value = ''
		input.dispatchEvent(new Event('input', { bubbles: true }))
	}
</script>

<div class="field-picker">
	<div class="field-heading">
		<label for={`${id}-input`}>Fields</label>
		<button
			type="button"
			class="selection-action"
			disabled={disabled || fields.length === 0}
			onclick={() => {
				selected = allSelected ? [] : [...fields]
			}}
		>
			{allSelected ? 'Clear selection' : 'Select all'}
		</button>
	</div>
	<Combobox.Root
		type="multiple"
		bind:value={selected}
		bind:open={expanded}
		{disabled}
		onValueChange={clearSearch}
		onOpenChange={(isOpen) => {
			if (!isOpen) void clearSearch()
		}}
	>
		<div class="combobox-control" bind:this={anchor}>
			<Combobox.Input
				bind:ref={input}
				id={`${id}-input`}
				placeholder="Search and choose fields…"
				clearOnDeselect
				onkeydown={(event) => {
					if (event.key === 'Enter' && !event.isComposing && !expanded) {
						event.preventDefault()
						expanded = true
					}
				}}
				oninput={(event) => {
					query = event.currentTarget.value
				}}
			>
				{#snippet child({ props })}<input
						{...props}
						autocomplete="off"
						class="combobox-input"
					/>{/snippet}
			</Combobox.Input>
			<Combobox.Trigger aria-label="Show fields">
				{#snippet child({ props })}<button {...props} class="combobox-trigger"
						><CaretUpDown /></button
					>{/snippet}
			</Combobox.Trigger>
		</div>
		<Combobox.Portal>
			<Combobox.Content customAnchor={anchor} sideOffset={4}>
				{#snippet child({ wrapperProps, props, open })}
					{#if open}
						<div {...wrapperProps}>
							<div {...props} class="combobox-content">
								<Combobox.Viewport>
									{#snippet child({ props: viewportProps })}
										<div {...viewportProps} class="combobox-viewport">
											{#each matches as field (field)}
												<Combobox.Item value={field} label={field}>
													{#snippet child({ props: itemProps, selected: checked })}
														<div {...itemProps} class="combobox-item">
															<span>{field}</span><span class="check" aria-hidden="true"
																>{#if checked}<Check />{/if}</span
															>
														</div>
													{/snippet}
												</Combobox.Item>
											{:else}<div class="combobox-empty">No matching fields</div>{/each}
										</div>
									{/snippet}
								</Combobox.Viewport>
							</div>
						</div>
					{/if}
				{/snippet}
			</Combobox.Content>
		</Combobox.Portal>
	</Combobox.Root>
</div>

<style>
	.field-picker {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.field-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-2);
	}
	label {
		font-size: 0.875rem;
		font-weight: 500;
	}
	.selection-action {
		border: 0;
		padding: 0;
		background: none;
		color: var(--color-primary);
		font-size: 0.75rem;
		cursor: pointer;
		text-decoration: underline;
	}
	.selection-action:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.combobox-control {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		border: 3px solid var(--color-surface-inverse);
		background: var(--color-surface-container-highest);
		min-height: 50px;
		padding: 0 var(--space-3);
	}
	.combobox-control:focus-within {
		background: var(--color-surface-inverse);
		color: var(--color-on-surface-inverse);
	}
	.combobox-input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		color: inherit;
		font-size: 16px;
		padding: 0;
	}
	.combobox-trigger {
		display: flex;
		align-items: center;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
	.combobox-content {
		width: var(--bits-combobox-anchor-width);
		background: var(--color-surface-container-highest);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-small);
		box-shadow: var(--shadow-raised);
		padding: var(--space-1);
		z-index: 2001;
	}
	.combobox-viewport {
		max-height: 240px;
		overflow-y: auto;
	}
	.combobox-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius-small);
		color: var(--color-on-surface);
		cursor: pointer;
		outline: none;
	}
	.combobox-item[data-highlighted] {
		background: var(--color-surface-container-low);
	}
	.combobox-item[data-selected] {
		color: var(--color-primary);
		font-weight: var(--font-weight-bold);
	}
	.check {
		width: 1em;
	}
	.combobox-empty {
		color: var(--color-on-surface-variant);
		font-size: 0.75rem;
	}
	.combobox-empty {
		padding: var(--space-3);
	}
</style>
