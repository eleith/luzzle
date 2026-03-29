<script lang="ts">
	import { DropdownMenu } from 'bits-ui'
	import DotsThreeVertical from 'virtual:icons/ph/dots-three-vertical'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'

	type Props = {
		file: string
		currentMode: 'form' | 'source' | 'preview'
		isDirty: boolean
		canGenerate: boolean
		onDelete: () => void
	}

	let { file, currentMode, isDirty, canGenerate, onDelete }: Props = $props()

	const switchUrl =
		currentMode === 'form' ? `/editor/piece/${file}/source` : `/editor/piece/${file}`
	const label = currentMode === 'form' ? 'source mode' : 'form mode'
	const previewUrl = `/editor/piece/${file}/preview`
	const returnParam = `?returnTo=${encodeURIComponent(page.url.pathname)}`
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="button button-variant-outline">
		<DotsThreeVertical />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content sideOffset={8} forceMount>
			{#snippet child({ open, props, wrapperProps })}
				{#if open}
					<div {...wrapperProps} class="dropdown-content">
						<div {...props}>
							<DropdownMenu.Item
								disabled={isDirty}
								onSelect={() => goto(`/editor/pieces/field/${file}${returnParam}`)}
							>
								{#snippet child({ props })}
									<div class="dropdown-item" {...props}>edit field</div>
								{/snippet}
							</DropdownMenu.Item>

							<DropdownMenu.Item disabled={isDirty} onSelect={() => goto(switchUrl)}>
								{#snippet child({ props })}
									<div class="dropdown-item" {...props}>{label}</div>
								{/snippet}
							</DropdownMenu.Item>

							{#if currentMode !== 'preview'}
								<DropdownMenu.Item disabled={isDirty} onSelect={() => goto(previewUrl)}>
									{#snippet child({ props })}
										<div class="dropdown-item" {...props}>preview</div>
									{/snippet}
								</DropdownMenu.Item>
							{/if}

							{#if canGenerate}
								<DropdownMenu.Item
									disabled={isDirty}
									onSelect={() => goto(`/editor/pieces/generate/${file}${returnParam}`)}
								>
									{#snippet child({ props })}
										<div class="dropdown-item" {...props}>generate</div>
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
