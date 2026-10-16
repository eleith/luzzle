<script lang="ts">
	import { DropdownMenu } from 'bits-ui'
	import { goto } from '$app/navigation'
	import { publishedHref, previewHref } from '$lib/pieces/navigation'
	import { getViewAvailability } from './view-state'

	type Props = {
		file: string
		hasPublishedVersion: boolean
		isSaving: boolean
	}

	let { file, hasPublishedVersion, isSaving }: Props = $props()
	const id = $props.id()
	const availability = $derived(getViewAvailability(hasPublishedVersion, isSaving))
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="button" data-variant="outline">View</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content sideOffset={8} forceMount>
			{#snippet child({ open, props, wrapperProps })}
				{#if open}
					<div {...wrapperProps}>
						<div {...props} class="dropdown-content">
							<DropdownMenu.Item
								textValue="Published"
								disabled={!availability.published}
								onSelect={() => goto(publishedHref(file))}
							>
								{#snippet child({ props })}
									<div
										{...props}
										class="dropdown-item"
										aria-labelledby={`${id}-published-label`}
										aria-describedby={`${id}-published-description`}
									>
										<span id={`${id}-published-label`}>Published</span>
										<span id={`${id}-published-description`} class="description">
											{#if isSaving}
												Wait for saving to finish.
											{:else if !hasPublishedVersion}
												No published version yet.
											{:else}
												View the published version.
											{/if}
										</span>
									</div>
								{/snippet}
							</DropdownMenu.Item>
							<DropdownMenu.Item
								textValue="Preview"
								disabled={!availability.preview}
								onSelect={() => goto(previewHref(file))}
							>
								{#snippet child({ props })}
									<div
										{...props}
										class="dropdown-item"
										aria-labelledby={`${id}-preview-label`}
										aria-describedby={`${id}-preview-description`}
									>
										<span id={`${id}-preview-label`}>Preview</span>
										<span id={`${id}-preview-description`} class="description">
											{#if isSaving}
												Wait for saving to finish.
											{:else}
												Uses saved Markdown.
											{/if}
										</span>
									</div>
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
		box-shadow: var(--shadow-raised);
		padding: var(--space-1);
		z-index: 1000;
	}

	.dropdown-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3);
		border-radius: var(--radius-small);
		color: var(--color-on-surface);
		cursor: pointer;
	}

	.dropdown-item[data-highlighted],
	.dropdown-item:focus-visible {
		background-color: var(--color-surface-container-low);
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
	}

	.dropdown-item[data-disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.description {
		font-size: var(--font-size-small);
	}
</style>
