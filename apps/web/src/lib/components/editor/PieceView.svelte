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
										aria-describedby={!availability.published
											? `${id}-published-description`
											: undefined}
									>
										<span id={`${id}-published-label`}>Published</span>
										{#if !availability.published}
											<span id={`${id}-published-description`} class="description">
												{#if isSaving}Saving…{:else}Not published yet{/if}
											</span>
										{/if}
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
										aria-describedby={!availability.preview
											? `${id}-preview-description`
											: undefined}
									>
										<span id={`${id}-preview-label`}>Preview</span>
										{#if !availability.preview}
											<span id={`${id}-preview-description`} class="description">Saving…</span>
										{/if}
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

	.dropdown-item:hover,
	.dropdown-item[data-highlighted] {
		background-color: var(--color-surface-container-low);
		outline: none;
	}

	.dropdown-item:focus-visible {
		outline: auto;
	}

	.dropdown-item[data-disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.description {
		font-size: var(--font-size-small);
	}
</style>
