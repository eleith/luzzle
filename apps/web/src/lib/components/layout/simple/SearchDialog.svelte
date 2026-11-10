<script lang="ts">
	import SearchIcon from 'virtual:icons/ph/magnifying-glass'
	import CloseIcon from 'virtual:icons/ph/x'
	import { fade } from 'svelte/transition'
	import { responsiveFly } from '#lib/components/ui/dialog-motion.js'
	import { Dialog } from 'bits-ui'
	import SearchForm from './SearchForm.svelte'
	import { afterNavigate } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'

	let query = $derived(page.url.searchParams.get('query') || '')
	let type = $derived(page.url.searchParams.get('type') || '')
	let after = $derived(page.url.searchParams.get('after') || '')
	let before = $derived(page.url.searchParams.get('before') || '')
	let isOpen = $state(false)

	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return

		isOpen = false
	})
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Trigger>
		{#snippet child({
			props
		}: {
			props: Record<string, unknown> & { onclick?: (e: Event) => unknown }
		})}
			<a
				href={resolve('search')}
				aria-label="search"
				{...props}
				onclick={(e) => {
					e.preventDefault()
					props.onclick?.(e)
				}}
			>
				<SearchIcon style="font-size: 1em;" />
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
						<Dialog.Title class="visually-hidden">Search</Dialog.Title>
						<Dialog.Description class="visually-hidden">
							Find pieces by keyword, type or date.
						</Dialog.Description>
						<!-- BitsUI focuses the first tabbable control: the query input. -->
						<SearchForm bind:query bind:type bind:after bind:before>
							{#snippet closeButton()}
								<Dialog.Close>
									{#snippet child({ props })}
										<button {...props} type="button" class="close-btn" aria-label="Close search">
											<CloseIcon style="font-size: 1.2em;" />
										</button>
									{/snippet}
								</Dialog.Close>
							{/snippet}
						</SearchForm>
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
</style>
