<script lang="ts">
	import { DropdownMenu } from 'bits-ui'
	import CaretDown from 'virtual:icons/ph/caret-down'

	type Props = {
		canGenerate: boolean
		disabled?: boolean
		onDelete: () => void
		onAttach?: () => void
		onGenerate?: () => void
	}

	let { canGenerate, disabled = false, onDelete, onAttach, onGenerate }: Props = $props()
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="button" data-variant="editor" {disabled}>
		More <CaretDown aria-hidden="true" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content sideOffset={8} forceMount>
			{#snippet child({ open, props, wrapperProps })}
				{#if open}
					<div {...wrapperProps}>
						<div {...props} class="dropdown-content">
							{#if canGenerate && onGenerate}
								<DropdownMenu.Item onSelect={onGenerate}>
									{#snippet child({ props })}
										<div class="dropdown-item" {...props}>Generate</div>
									{/snippet}
								</DropdownMenu.Item>
							{/if}

							{#if onAttach}
								<DropdownMenu.Item onSelect={onAttach}>
									{#snippet child({ props })}
										<div class="dropdown-item" {...props}>Attach</div>
									{/snippet}
								</DropdownMenu.Item>
							{/if}

							<DropdownMenu.Item onSelect={onDelete}>
								{#snippet child({ props })}
									<div class="dropdown-item destructive" {...props}>Delete</div>
								{/snippet}
							</DropdownMenu.Item>
						</div>
					</div>
				{/if}
			{/snippet}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
	.dropdown-content {
		background-color: var(--editor-panelBackground, var(--color-surface-container));
		color: var(--editor-panelForeground, var(--color-on-surface));
		border: 1px solid var(--editor-border, var(--color-outline));
		border-radius: var(--radius-small);
		box-sizing: border-box;
		width: 10rem;
		max-width: calc(100vw - 1rem);
		padding: var(--space-1);
		font-family: var(--font-mono-name), monospace;
		font-size: var(--font-size-xxs);
		line-height: 1.4;
		box-shadow: var(--shadow-raised);
		z-index: 1000;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		min-height: calc(var(--space-4) + var(--space-2));
		padding: var(--space-1) var(--space-2);
		cursor: pointer;
		color: inherit;
		gap: var(--space-2);
		border-radius: var(--radius-small);
		box-sizing: border-box;
		width: 100%;
		text-align: left;
		text-decoration: none;
		background: none;
		border: none;
		font: inherit;
		text-transform: none;
	}

	.dropdown-item:hover,
	.dropdown-item[data-highlighted] {
		background-color: var(--editor-selection, var(--color-surface-container-highest));
		outline: none;
	}

	.dropdown-item:focus-visible {
		outline: 2px solid var(--editor-caret, var(--color-primary));
		outline-offset: -2px;
	}

	.dropdown-item[data-disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.destructive {
		color: var(--color-error);
	}
</style>
