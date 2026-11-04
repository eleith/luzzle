<script lang="ts">
	import type { Snippet } from 'svelte'
	import SearchIcon from 'virtual:icons/ph/magnifying-glass'
	import CaretUpDownIcon from 'virtual:icons/ph/caret-up-down'
	import { Select } from 'bits-ui'
	import DatePicker from '#lib/components/ui/DatePicker.svelte'
	import { page } from '$app/state'
	import { afterNavigate, goto } from '$app/navigation'
	import { resolve } from '$app/paths'

	type Props = {
		query?: string
		type?: string
		after?: string
		before?: string
		closeButton?: Snippet
	}

	let {
		query = $bindable(''),
		type = $bindable(''),
		after = $bindable(''),
		before = $bindable(''),
		closeButton
	}: Props = $props()
	const id = $props.id()
	const pieceTypes = $derived(page.data.pieceTypes ?? [])
	let navigationError = $state(false)

	function clearFilters() {
		query = ''
		type = ''
		after = ''
		before = ''
	}

	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return

		navigationError = false
	})

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		navigationError = false

		const filters: Record<string, string> = {}
		if (query) filters.query = query
		if (type) filters.type = type
		if (after) filters.after = after
		if (before) filters.before = before

		// Start from the filters, not the current URL, so pagination is cleared.
		const searchString = new URLSearchParams(filters).toString()
		try {
			const destination = searchString ? resolve(`search?${searchString}`) : resolve('search')
			await goto(destination)
		} catch {
			navigationError = true
		}
	}
</script>

<form method="GET" action={resolve('search')} onsubmit={handleSubmit} class="search-form">
	<div class="search-input-wrapper" class:has-close-button={!!closeButton}>
		<SearchIcon class="search-input-icon" />
		<input
			id={`${id}-query`}
			aria-label="Search query"
			type="search"
			placeholder="Search by keyword, title, metadata..."
			name="query"
			bind:value={query}
			class="search-input"
			autocomplete="off"
		/>
		{@render closeButton?.()}
	</div>

	<input type="hidden" name="after" value={after} />
	<input type="hidden" name="before" value={before} />

	<div class="form-body">
		<div class="filters-container">
			<span class="filters-header">Refine results</span>

			<div class="filter-field">
				<label for={`${id}-type`} class="filter-label">Piece Type</label>
				<Select.Root type="single" name="type" bind:value={type}>
					<Select.Trigger id={`${id}-type`}>
						{#snippet child({ props })}
							<button {...props} class="select-trigger">
								<span>{type || 'All Types'}</span>
								<CaretUpDownIcon
									style="width: 1em; height: 1em; color: var(--color-on-surface-variant);"
								/>
							</button>
						{/snippet}
					</Select.Trigger>
					<Select.Portal>
						<Select.Content sideOffset={4}>
							{#snippet child({ wrapperProps, props, open })}
								{#if open}
									<div {...wrapperProps}>
										<div {...props} class="select-content">
											<Select.Viewport class="select-viewport">
												<Select.Item value="" class="select-item">
													{#snippet children({ selected })}
														<span class="select-item-text" class:selected>All Types</span>
													{/snippet}
												</Select.Item>
												{#each pieceTypes as pt (pt)}
													<Select.Item value={pt} class="select-item">
														{#snippet children({ selected })}
															<span class="select-item-text" class:selected>{pt}</span>
														{/snippet}
													</Select.Item>
												{/each}
											</Select.Viewport>
										</div>
									</div>
								{/if}
							{/snippet}
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			</div>

			<div class="date-filters-group">
				<DatePicker label="After" bind:value={after} />
				<DatePicker label="Before" bind:value={before} />
			</div>
		</div>

		{#if navigationError}
			<p role="alert">Search navigation did not complete. Your filters are still here.</p>
		{/if}

		<div class="actions-container">
			{#if query || type || after || before}
				<button type="button" onclick={clearFilters} class="button clear-btn" data-variant="link">
					Clear Filters
				</button>
			{/if}
			<button type="submit" class="button submit-btn" data-variant="primary"> Search </button>
		</div>
	</div>
</form>

<style>
	.search-form {
		display: flex;
		flex-direction: column;
		gap: 0;
		border-radius: inherit;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		border-bottom: 2px solid var(--color-outline);
		background: var(--color-surface-container-highest);
		height: 60px;
		width: 100%;
		border-top-left-radius: inherit;
		border-top-right-radius: inherit;
	}

	.search-input-wrapper :global(.search-input-icon) {
		position: absolute;
		left: var(--space-3);
		color: var(--color-on-surface-variant);
		font-size: 1.4em;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		height: 100%;
		border: none;
		background: transparent;
		color: var(--color-on-surface);
		font-size: 18px;
		padding: 0 calc(var(--space-3) + 12px) 0 calc(var(--space-3) + 2.5em);
		outline: none;
		border-top-left-radius: inherit;
		border-top-right-radius: inherit;
	}

	.search-input:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: -3px;
	}

	.has-close-button .search-input {
		padding-right: calc(var(--space-3) + 52px);
	}

	.search-input::placeholder {
		color: var(--color-on-surface-variant);
		opacity: 0.6;
	}

	.form-body {
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.filters-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.filters-header {
		font-size: var(--font-size-xs);
		color: var(--color-on-surface-variant);
		font-weight: var(--font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-1);
	}

	.filter-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.filter-label {
		font-size: var(--font-size-xs);
		color: var(--color-on-surface-variant);
		text-transform: uppercase;
		font-weight: var(--font-weight-medium);
	}

	.select-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border: 3px solid var(--color-surface-inverse);
		background: var(--color-surface-container-highest);
		height: 50px;
		color: var(--color-on-surface);
		font-size: 16px;
		padding: 0 12px;
		outline: none;
		cursor: pointer;
		width: 100%;
	}

	.select-trigger:focus {
		background: var(--color-surface-inverse);
		color: var(--color-on-surface-inverse);
	}

	.select-content {
		background-color: var(--color-surface-container-highest);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-small);
		width: var(--bits-select-anchor-width);
		box-sizing: border-box;
		box-shadow: var(--shadow-raised);
		z-index: 2001;
		padding: var(--space-1);
	}

	.select-content :global(.select-viewport) {
		max-height: 250px;
		overflow-y: auto;
	}

	.select-content :global(.select-item) {
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

	.select-content :global(.select-item:hover),
	.select-content :global(.select-item[data-highlighted]) {
		background-color: var(--color-surface-container-low);
	}

	.select-content :global(.select-item-text.selected) {
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
	}

	.date-filters-group {
		display: flex;
		gap: var(--space-4);
	}

	@media (max-width: 639px) {
		.date-filters-group {
			flex-direction: column;
		}
	}

	.actions-container {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: var(--space-4);
		margin-top: var(--space-2);
	}

	.clear-btn {
		font-size: 14px;
	}

	.submit-btn {
		min-width: 100px;
	}

	@media (max-width: 767px) {
		.has-close-button .search-input {
			padding-right: calc(var(--space-3) + 12px);
		}
	}
</style>
