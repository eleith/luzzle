<script lang="ts">
	import SearchIcon from 'virtual:icons/ph/magnifying-glass'
	import CloseIcon from 'virtual:icons/ph/x'
	import { fade } from 'svelte/transition'
	import { Dialog, Select } from 'bits-ui'
	import DatePicker from '$lib/components/ui/DatePicker.svelte'
	import { getPieceTypes } from '$lib/pieces/helpers'
	import { page } from '$app/state'
	import { afterNavigate, goto } from '$app/navigation'

	const pieceTypes = getPieceTypes()

	let query = $state('')
	let type = $state('')
	let after = $state('')
	let before = $state('')

	let isOpen = $state(false)

	$effect(() => {
		query = page.url.searchParams.get('query') || ''
		type = page.url.searchParams.get('type') || ''
		after = page.url.searchParams.get('after') || ''
		before = page.url.searchParams.get('before') || ''
	})

	function clearFilters() {
		query = ''
		type = ''
		after = ''
		before = ''
	}

	afterNavigate(() => {
		isOpen = false
	})

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		const params = new URLSearchParams()
		if (query) params.set('query', query)
		if (type) params.set('type', type)
		if (after) params.set('after', after)
		if (before) params.set('before', before)

		const searchString = params.toString()
		const url = `/search${searchString ? `?${searchString}` : ''}`
		goto(url)
	}

	function responsiveFly(node: HTMLElement, { duration = 300 }) {
		return {
			duration,
			css: (t: number) => {
				return `
					opacity: ${t};
					transform: translate(var(--fly-x, 0px), calc((1 - ${t}) * var(--fly-y-offset, 0px)));
				`
			}
		}
	}
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Trigger>
		{#snippet child({
			props
		}: {
			props: Record<string, unknown> & { onclick?: (e: Event) => unknown }
		})}
			<a
				href="/search"
				aria-label="search"
				{...props}
				onclick={(e) => {
					e.preventDefault()
					props.onclick?.(e)
				}}
			>
				<SearchIcon style="font-size: 1.25em;" />
			</a>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div class="searchOverlay" {...props} transition:fade={{ duration: 150 }}></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div class="search-modal" {...props} transition:responsiveFly={{ duration: 300 }}>
						<form method="GET" action="/search" onsubmit={handleSubmit} class="search-form">
							<!-- svelte-ignore a11y_autofocus -->
							<div class="search-input-wrapper">
								<SearchIcon class="search-input-icon" />
								<input
									type="search"
									placeholder="Search by keyword, title, metadata..."
									name="query"
									bind:value={query}
									class="search-input"
									autocomplete="off"
									autofocus
								/>
								<Dialog.Close>
									{#snippet child({ props })}
										<button {...props} type="button" class="close-btn" aria-label="Close search">
											<CloseIcon style="font-size: 1.2em;" />
										</button>
									{/snippet}
								</Dialog.Close>
							</div>

							<input type="hidden" name="after" value={after} />
							<input type="hidden" name="before" value={before} />

							<div class="modal-body">
								<div class="filters-container">
									<span class="filters-header">Refine results</span>

									<div class="filter-field">
										<label for="type-select-trigger" class="filter-label">Piece Type</label>
										<Select.Root type="single" name="type" bind:value={type}>
											<Select.Trigger>
												{#snippet child({ props })}
													<button {...props} id="type-select-trigger" class="select-trigger">
														<span>{type || 'All Types'}</span>
														<span class="select-chevron">▼</span>
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
																				<span class="select-item-text" class:selected
																					>All Types</span
																				>
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

								<div class="actions-container">
									{#if query || type || after || before}
										<button
											type="button"
											onclick={clearFilters}
											class="button clear-btn"
											data-variant="link"
										>
											Clear Filters
										</button>
									{/if}
									<button type="submit" class="button submit-btn" data-variant="primary">
										Search
									</button>
								</div>
							</div>
						</form>
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.searchOverlay {
		position: fixed;
		inset: 0;
		background-color: color-mix(in srgb, var(--color-surface-dim) 60%, transparent);
		backdrop-filter: blur(4px);
		z-index: 1000;
	}

	.search-modal {
		position: fixed;
		background: var(--color-surface-container-high);
		border-top: 2px solid var(--color-outline);
		box-shadow: 0 -4px 24px var(--color-shadow);
		z-index: 1001;
		display: flex;
		flex-direction: column;
		outline: none;
		overflow: hidden;
	}

	/* Mobile Styles (Bottom Sheet) */
	@media (max-width: 767px) {
		.search-modal {
			bottom: 0;
			left: 0;
			right: 0;
			border-radius: 0;
			padding: 0;
			max-height: 85vh;
			overflow-y: auto;
			--fly-x: 0px;
			--fly-y-offset: 400px;
		}

		.close-btn {
			display: none;
		}

		.search-input {
			padding-right: calc(var(--space-3) + 12px);
		}
	}

	@media (min-width: 768px) {
		.search-modal {
			top: 10vh;
			left: 50%;
			transform: translateX(-50%);
			width: 600px;
			border: 2px solid var(--color-outline);
			border-radius: var(--radius-medium);
			padding: 0;
			max-height: 80vh;
			--fly-x: -50%;
			--fly-y-offset: -200px;
		}
	}

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

	.close-btn {
		position: absolute;
		right: var(--space-3);
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		box-shadow: none;
		padding: 0;
		color: var(--color-on-surface-variant);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		transition:
			background-color 0.15s,
			color 0.15s;
		text-transform: none;
		min-width: 0;
		min-height: 0;
	}

	.close-btn:hover {
		background-color: var(--color-surface-container-low);
		color: var(--color-on-surface);
	}

	.search-input {
		width: 100%;
		height: 100%;
		border: none;
		background: transparent;
		color: var(--color-on-surface);
		font-size: 18px;
		padding: 0 calc(var(--space-3) + 52px) 0 calc(var(--space-3) + 2.5em);
		outline: none;
		border-top-left-radius: inherit;
		border-top-right-radius: inherit;
	}

	.search-input::placeholder {
		color: var(--color-on-surface-variant);
		opacity: 0.6;
	}

	.modal-body {
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

	.select-chevron {
		font-size: 0.7em;
		color: var(--color-on-surface-variant);
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
</style>
