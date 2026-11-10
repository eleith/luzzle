<script lang="ts">
	import { Dialog, DropdownMenu } from 'bits-ui'
	import { tick, untrack } from 'svelte'
	import { fade } from 'svelte/transition'
	import { responsiveFly } from '#lib/components/ui/dialog-motion.js'
	import { MediaQuery } from 'svelte/reactivity'
	import { enhance } from '$app/forms'
	import { resolve } from '$app/paths'
	import { encodeArchivePath } from '#lib/pieces/navigation.js'
	import CaretDown from 'virtual:icons/ph/caret-down'
	import X from 'virtual:icons/ph/x'

	type Props = {
		file: string
		canGenerate: boolean
		disabled?: boolean
		hasPublishedVersion?: boolean
		onPublish: () => void
		publishDisabled: boolean
		previewDisabled?: boolean
		unpublishDisabled?: boolean
		vimEnabled: boolean
		onVimChange: (enabled: boolean) => void
		onEditorFocus: () => void
		onFormat: () => void
		formatDisabled?: boolean
		onUnpublish?: () => void
		onDelete: () => void
		onAttach?: () => void
		onGenerate?: () => void
	}

	let {
		file,
		canGenerate,
		disabled = false,
		hasPublishedVersion = false,
		onPublish,
		publishDisabled,
		previewDisabled = false,
		unpublishDisabled = false,
		vimEnabled,
		onVimChange,
		onEditorFocus,
		onFormat,
		formatDisabled = false,
		onUnpublish,
		onDelete,
		onAttach,
		onGenerate
	}: Props = $props()

	const id = $props.id()
	const path = $derived(encodeArchivePath(file))
	const phone = new MediaQuery('(max-width: 767px)', false)
	let menuOpen = $state(false)
	let sheetOpen = $state(false)
	let trigger: HTMLButtonElement | null = $state(null)
	let previewForm: HTMLFormElement
	let focusEditorOnClose = false
	let handingOffFocus = false

	type ActionId =
		| 'publish'
		| 'preview'
		| 'published'
		| 'vim'
		| 'format'
		| 'generate'
		| 'attach'
		| 'unpublish'
		| 'delete'
	type Action = {
		id: ActionId
		run?: () => void
		href?: string
		disabled?: boolean
		opensDialog?: boolean
	}
	const groups = $derived.by(() => {
		const view: Action[] = [
			{
				id: 'preview',
				run: () => previewForm.requestSubmit(),
				disabled: previewDisabled
			}
		]
		if (hasPublishedVersion)
			view.push({
				id: 'published',
				href: resolve('/(auth)/admin/piece/[...path]/published', { path })
			})
		const editor: Action[] = [
			{ id: 'format', run: onFormat, disabled: formatDisabled },
			{ id: 'vim' }
		]
		if (canGenerate && onGenerate)
			editor.push({ id: 'generate', run: onGenerate, opensDialog: true })
		if (onAttach) editor.push({ id: 'attach', run: onAttach, opensDialog: true })
		const destructive: Action[] = []
		if (hasPublishedVersion && onUnpublish)
			destructive.push({ id: 'unpublish', run: onUnpublish, disabled: unpublishDisabled })
		destructive.push({ id: 'delete', run: onDelete, opensDialog: true })
		return [
			{
				id: 'publication',
				actions: [{ id: 'publish', run: onPublish, disabled: publishDisabled } as Action]
			},
			{ id: 'view', actions: view },
			{ id: 'editor', actions: editor },
			{ id: 'destructive', actions: destructive }
		]
	})

	$effect(() => {
		const phoneLayout = phone.current
		untrack(() => {
			const previousPopupOpen = phoneLayout ? menuOpen : sheetOpen
			if (!previousPopupOpen) return
			menuOpen = false
			sheetOpen = false
			void tick().then(() => trigger?.focus())
		})
	})

	async function selectAction(action: Action) {
		focusEditorOnClose = action.id === 'vim' || action.id === 'format'
		handingOffFocus = !!action.opensDialog
		if (action.id === 'vim') onVimChange(!vimEnabled)
		menuOpen = false
		sheetOpen = false
		// Let the current popup release its focus before opening another dialog.
		await tick()
		if (action.opensDialog) trigger?.focus()
		action.run?.()
	}

	function restoreFocus(event: Event, fromPhone: boolean) {
		if (fromPhone !== phone.current || handingOffFocus) {
			event.preventDefault()
		} else if (focusEditorOnClose) {
			event.preventDefault()
			onEditorFocus()
		}
		focusEditorOnClose = false
		handingOffFocus = false
	}
</script>

<form
	hidden
	method="post"
	action={resolve('/(auth)/admin/piece/[...path]/preview', { path })}
	bind:this={previewForm}
	use:enhance
></form>

{#snippet actionLabel(action: Action)}
	<span class="action-copy">
		{#if action.id === 'publish'}Publish
		{:else if action.id === 'preview'}Preview
		{:else if action.id === 'published'}View published
		{:else if action.id === 'format'}Format
		{:else if action.id === 'vim'}Vim mode
		{:else if action.id === 'generate'}Generate
		{:else if action.id === 'attach'}Attach
		{:else if action.id === 'unpublish'}Unpublish
		{:else if action.id === 'delete'}Delete{/if}
	</span>
	{#if action.id === 'vim'}
		<span aria-hidden="true"
			>{#if vimEnabled}On{:else}Off{/if}</span
		>
	{/if}
{/snippet}

{#snippet groupedActions(mobile: boolean)}
	{#each groups as group (group.id)}
		<div
			class="action-group"
			class:destructive={group.id === 'destructive'}
			role="group"
			aria-labelledby={`${id}-${mobile ? 'sheet' : 'menu'}-${group.id}`}
		>
			<p class="group-label" id={`${id}-${mobile ? 'sheet' : 'menu'}-${group.id}`}>
				{#if group.id === 'publication'}Publication
				{:else if group.id === 'view'}View
				{:else if group.id === 'editor'}Editor
				{:else if group.id === 'destructive'}Destructive actions{/if}
			</p>
			{#each group.actions as action (action.id)}
				{#if mobile}
					{#if action.href}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- The shared action list resolves this URL before rendering. -->
						<a class="action-item" href={action.href} onclick={() => (sheetOpen = false)}>
							{@render actionLabel(action)}
						</a>
					{:else}
						<button
							type="button"
							class="action-item"
							disabled={action.disabled}
							aria-pressed={action.id === 'vim' ? vimEnabled : undefined}
							onclick={() => selectAction(action)}>{@render actionLabel(action)}</button
						>
					{/if}
				{:else if action.id === 'vim'}
					<DropdownMenu.CheckboxItem
						checked={vimEnabled}
						onCheckedChange={() => selectAction(action)}
					>
						{#snippet child({ props })}
							<div {...props} class="action-item">
								{@render actionLabel(action)}
							</div>
						{/snippet}
					</DropdownMenu.CheckboxItem>
				{:else}
					<DropdownMenu.Item
						disabled={action.disabled}
						onSelect={action.href ? undefined : () => selectAction(action)}
					>
						{#snippet child({ props })}
							{#if action.href}
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- The shared action list resolves this URL before rendering. -->
								<a {...props} class="action-item" href={action.href}
									>{@render actionLabel(action)}</a
								>
							{:else}
								<div {...props} class="action-item">{@render actionLabel(action)}</div>
							{/if}
						{/snippet}
					</DropdownMenu.Item>
				{/if}
			{/each}
		</div>
	{/each}
{/snippet}

{#if phone.current}
	<Dialog.Root bind:open={sheetOpen}>
		<Dialog.Trigger
			type="button"
			class="button"
			data-variant="editor"
			aria-label="More"
			{disabled}
			bind:ref={trigger}
		>
			More
		</Dialog.Trigger>
		<Dialog.Portal>
			<Dialog.Overlay forceMount>
				{#snippet child({ props, open })}
					{#if open}
						<div {...props} class="sheet-overlay" transition:fade={{ duration: 150 }}></div>
					{/if}
				{/snippet}
			</Dialog.Overlay>
			<Dialog.Content forceMount onCloseAutoFocus={(event) => restoreFocus(event, true)}>
				{#snippet child({ props, open })}
					{#if open}
						<div {...props} class="action-sheet" transition:responsiveFly={{ duration: 300 }}>
							<div class="sheet-header">
								<Dialog.Title>
									{#snippet child({ props })}
										<h2 {...props} class="sheet-title">Piece actions</h2>
									{/snippet}
								</Dialog.Title>
								<Dialog.Close>
									{#snippet child({ props })}
										<button
											{...props}
											type="button"
											class="close-button"
											aria-label="Close actions"
										>
											<X aria-hidden="true" />
										</button>
									{/snippet}
								</Dialog.Close>
							</div>
							<Dialog.Description class="visually-hidden">
								View, edit or manage this piece.
							</Dialog.Description>
							<div class="sheet-body">
								{@render groupedActions(true)}
							</div>
						</div>
					{/if}
				{/snippet}
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{:else}
	<DropdownMenu.Root bind:open={menuOpen}>
		<DropdownMenu.Trigger class="button" data-variant="editor" {disabled} bind:ref={trigger}>
			More <CaretDown aria-hidden="true" />
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				sideOffset={8}
				forceMount
				onCloseAutoFocus={(event) => restoreFocus(event, false)}
			>
				{#snippet child({ open, props, wrapperProps })}
					{#if open}
						<div {...wrapperProps}>
							<div {...props} class="dropdown-content">{@render groupedActions(false)}</div>
						</div>
					{/if}
				{/snippet}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
{/if}

<style>
	.dropdown-content {
		background: var(--editor-panelBackground, var(--color-surface-container));
		color: var(--editor-panelForeground, var(--color-on-surface));
		border: 1px solid var(--editor-border, var(--color-outline));
		box-sizing: border-box;
		font-family: var(--font-mono-name), monospace;
		box-shadow: var(--shadow-raised);
		z-index: 1001;
		border-radius: var(--radius-small);
		width: 15rem;
		max-width: calc(100vw - 1rem);
		max-height: var(--bits-dropdown-menu-content-available-height);
		overflow-y: auto;
		padding: var(--space-1);
		font-size: var(--font-size-xxs);
		line-height: 1.4;
	}

	.action-group + .action-group {
		border-top: 1px solid var(--editor-border, var(--color-outline));
		margin-top: var(--space-1);
		padding-top: var(--space-1);
	}

	.group-label {
		margin: 0;
		padding: var(--space-1) var(--space-2);
		font-size: var(--font-size-xxs);
		color: var(--editor-descriptionForeground, var(--color-on-surface-variant));
	}

	.action-item {
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
		letter-spacing: normal;
		box-shadow: none;
	}

	.action-copy {
		flex: 1;
	}

	.action-item:hover,
	.action-item[data-highlighted] {
		background: var(--editor-selection, var(--color-surface-container-highest));
		outline: none;
	}

	.action-item:focus-visible,
	.close-button:focus-visible {
		outline: 2px solid var(--editor-caret, var(--color-primary));
		outline-offset: -2px;
	}

	.action-item[data-disabled],
	.action-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.destructive .action-item {
		color: var(--color-error);
	}

	.sheet-overlay {
		position: fixed;
		inset: 0;
		background: color-mix(in srgb, var(--color-surface-dim) 60%, transparent);
		backdrop-filter: blur(4px);
		z-index: 1000;
	}

	.action-sheet {
		position: fixed;
		inset: auto 0 0;
		display: flex;
		flex-direction: column;
		max-height: 85dvh;
		box-sizing: border-box;
		overflow: hidden;
		outline: none;
		border: none;
		border-top: 2px solid var(--editor-border, var(--color-outline));
		border-radius: 0;
		background: var(--editor-panelBackground, var(--color-surface-container));
		color: var(--editor-panelForeground, var(--color-on-surface));
		box-shadow: var(--shadow-raised);
		font-family: var(--font-mono-name), monospace;
		font-size: var(--font-size-xs);
		z-index: 1001;
		--fly-x: 0px;
		--fly-y-offset: 400px;
	}

	.sheet-body {
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: var(--space-5);
		padding-bottom: max(var(--space-5), env(safe-area-inset-bottom));
	}

	.sheet-header {
		display: flex;
		flex-shrink: 0;
		padding: var(--space-2) var(--space-5);
		border-bottom: 2px solid var(--editor-border, var(--color-outline));
		background: var(--editor-panelBackground, var(--color-surface-container));
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.sheet-title {
		font: inherit;
		font-weight: 600;
		margin: 0;
	}

	.close-button {
		display: grid;
		place-items: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0;
		background: none;
		border: none;
		box-shadow: none;
		color: inherit;
		cursor: pointer;
	}

	.action-sheet .action-item {
		min-height: 44px;
		padding: var(--space-2);
	}
</style>
