<script lang="ts">
	import { DropdownMenu } from 'bits-ui'
	import DotsThreeVertical from 'virtual:icons/ph/dots-three-vertical'
	import { goto } from '$app/navigation'
	import { editorHref } from '$lib/pieces/navigation'

	type Props = {
		file: string
		currentMode: 'source' | 'preview'
		canGenerate: boolean
		canPublish: boolean
		onDelete: () => void
		onAttach?: () => void
		onGenerate?: () => void
	}

	let { file, currentMode, canGenerate, canPublish, onDelete, onAttach, onGenerate }: Props =
		$props()
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="button" data-variant="outline" aria-label="Piece actions">
		<DotsThreeVertical />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content sideOffset={8} forceMount>
			{#snippet child({ open, props, wrapperProps })}
				{#if open}
					<div {...wrapperProps}>
						<div {...props} class="dropdown-content">
							{#if canPublish}
								<DropdownMenu.Item onSelect={() => goto('/admin/publish?check=1')}>
									{#snippet child({ props })}
										<div class="dropdown-item" {...props}>publish</div>
									{/snippet}
								</DropdownMenu.Item>
							{/if}

							{#if canGenerate}
								<DropdownMenu.Item
									onSelect={() => {
										if (currentMode === 'source' && onGenerate) onGenerate()
										else goto(editorHref(file) + '?generate=1')
									}}
								>
									{#snippet child({ props })}
										<div class="dropdown-item" {...props}>generate</div>
									{/snippet}
								</DropdownMenu.Item>
							{/if}

							{#if currentMode === 'source' && onAttach}
								<DropdownMenu.Item onSelect={onAttach}>
									{#snippet child({ props })}
										<div class="dropdown-item" {...props}>attach</div>
									{/snippet}
								</DropdownMenu.Item>
							{/if}

							<DropdownMenu.Item onSelect={onDelete}>
								{#snippet child({ props })}
									<div class="dropdown-item destructive" {...props}>delete</div>
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
		background-color: var(--color-surface-container-highest);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-small);
		min-width: 160px;
		box-shadow: var(--shadow-raised);
		z-index: 1000;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		padding: var(--space-3);
		cursor: pointer;
		color: var(--color-on-surface);
		gap: var(--space-2);
		border-radius: var(--radius-small);
		width: 100%;
		text-align: left;
		text-decoration: none;
		background: none;
		border: none;
		text-transform: uppercase;
	}

	.dropdown-item:hover {
		background-color: var(--color-surface-container-low);
		outline: none;
	}

	.dropdown-item[data-disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.destructive {
		color: var(--color-error);
	}
</style>
