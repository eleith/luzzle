<script lang="ts">
	import { Combobox as ComboboxPrimitive } from 'bits-ui'
	import CaretUpDownIcon from 'virtual:icons/ph/caret-up-down'

	type Item = { value: string; label: string }

	type Props = {
		value: string
		items: Item[]
		name?: string
		placeholder?: string
		label?: string
		required?: boolean
		autofocus?: boolean
	}

	let {
		value = $bindable(''),
		items,
		name,
		placeholder = 'search...',
		label,
		required = false,
		autofocus = false
	}: Props = $props()

	const initialLabel = items.find((item) => item.value === value)?.label ?? ''

	let open = $state(false)
	let filterText = $state(initialLabel)
	// only filter once the user has actually typed — otherwise opening via the
	// trigger button re-filters against the already-selected item's full label
	let touched = $state(false)
	let controlRef = $state<HTMLDivElement | null>(null)

	const filteredItems = $derived(
		touched && filterText.trim()
			? items.filter((item) => item.label.toLowerCase().includes(filterText.trim().toLowerCase()))
			: items
	)

	// size the control to fit the longest option, rather than stretching full width
	const inputSize = $derived(
		Math.max(placeholder.length, 10, ...items.map((item) => item.label.length))
	)

	// keep the input text in sync with the actual selection whenever the list is closed
	$effect(() => {
		if (!open) {
			touched = false
			const selected = items.find((item) => item.value === value)
			filterText = selected ? selected.label : ''
		}
	})
</script>

<div class="combobox-wrapper">
	{#if label}
		<span class="combobox-label">{label}</span>
	{/if}
	<ComboboxPrimitive.Root type="single" {name} {required} bind:value bind:open>
		<div class="combobox-control" bind:this={controlRef}>
			<ComboboxPrimitive.Input
				{placeholder}
				{autofocus}
				size={inputSize}
				defaultValue={initialLabel}
				oninput={(e: Event) => {
					touched = true
					filterText = (e.currentTarget as HTMLInputElement).value
				}}
			>
				{#snippet child({ props })}
					<input {...props} class="combobox-input" />
				{/snippet}
			</ComboboxPrimitive.Input>
			<ComboboxPrimitive.Trigger>
				{#snippet child({ props })}
					<button {...props} class="combobox-trigger-btn">
						<CaretUpDownIcon
							style="width: 1em; height: 1em; color: var(--color-on-surface-variant);"
						/>
					</button>
				{/snippet}
			</ComboboxPrimitive.Trigger>
		</div>
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Content customAnchor={controlRef} sideOffset={4}>
				{#snippet child({ wrapperProps, props, open })}
					{#if open}
						<div {...wrapperProps}>
							<div {...props} class="combobox-content">
								<ComboboxPrimitive.Viewport>
									{#snippet child({ props: viewportProps })}
										<div {...viewportProps} class="combobox-viewport">
											{#each filteredItems as item (item.value)}
												<ComboboxPrimitive.Item value={item.value} label={item.label}>
													{#snippet child({ props: itemProps, selected })}
														<div {...itemProps} class="combobox-item">
															<span class="combobox-item-text" class:selected>{item.label}</span>
														</div>
													{/snippet}
												</ComboboxPrimitive.Item>
											{:else}
												<div class="combobox-empty">no matches</div>
											{/each}
										</div>
									{/snippet}
								</ComboboxPrimitive.Viewport>
							</div>
						</div>
					{/if}
				{/snippet}
			</ComboboxPrimitive.Content>
		</ComboboxPrimitive.Portal>
	</ComboboxPrimitive.Root>
</div>

<style>
	.combobox-wrapper {
		display: inline-flex;
		flex-direction: column;
		gap: var(--space-2);
		width: fit-content;
	}

	.combobox-label {
		font-size: var(--font-size-xs);
		color: var(--color-on-surface-variant);
		text-transform: uppercase;
		font-weight: var(--font-weight-medium);
	}

	.combobox-control {
		display: flex;
		align-items: center;
		border: 3px solid var(--color-surface-inverse);
		background: var(--color-surface-container-highest);
		height: 50px;
		padding: 0 12px;
		box-sizing: border-box;
		width: fit-content;
	}

	.combobox-control:focus-within {
		background: var(--color-surface-inverse);
		color: var(--color-on-surface-inverse);
	}

	.combobox-input {
		flex: 1;
		border: none;
		background: transparent;
		color: inherit;
		font-size: 16px;
		outline: none;
		padding: 0;
		min-width: 0;
	}

	.combobox-trigger-btn {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		padding: 0;
		margin-left: var(--space-2);
	}

	.combobox-content {
		background-color: var(--color-surface-container-highest);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-small);
		width: var(--bits-combobox-anchor-width);
		box-sizing: border-box;
		box-shadow: var(--shadow-raised);
		z-index: 2001;
		padding: var(--space-1);
	}

	.combobox-viewport {
		max-height: 250px;
		overflow-y: auto;
	}

	.combobox-item {
		display: flex;
		align-items: center;
		padding: var(--space-3);
		cursor: pointer;
		color: var(--color-on-surface);
		border-radius: var(--radius-small);
		width: 100%;
		text-align: left;
		user-select: none;
		outline: none;
	}

	.combobox-item:hover,
	.combobox-item[data-highlighted] {
		background-color: var(--color-surface-container-low);
	}

	.combobox-item-text.selected {
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
	}

	.combobox-empty {
		padding: var(--space-3);
		color: var(--color-on-surface-variant);
		font-size: var(--font-size-xs);
	}
</style>
