<script lang="ts">
	import { Dialog, Tabs } from 'bits-ui'
	import { onDestroy, tick, untrack } from 'svelte'
	import { fade, fly } from 'svelte/transition'
	import CircleNotch from 'virtual:icons/ph/circle-notch-bold'
	import Button from '$lib/components/ui/Button.svelte'
	import GenerationFields from './GenerationFields.svelte'
	import { startGeneration } from '$lib/generation/client'

	type Props = {
		open: boolean
		file: string
		source: string
		fields: string[]
		onApply: (source: string, markdown: string) => void
		onFocusEditor: () => void
		onError: (message: string) => void
	}
	let {
		open = $bindable(false),
		file,
		source,
		fields,
		onApply,
		onFocusEditor,
		onError
	}: Props = $props()
	const id = $props.id()
	let target = $state<'fields' | 'body'>('fields')
	let selected = $state<string[]>(untrack(() => [...fields]))
	let fieldPicker = $state<GenerationFields>()
	let fieldInstructions = $state<string>()
	let bodyInstructions = $state('')
	let files = $state<FileList>()
	const selectedFiles = $derived(Array.from(files ?? []))
	const totalFileBytes = $derived(selectedFiles.reduce((total, file) => total + file.size, 0))
	let busy = $state(false)
	let phase = $state('preparation')
	let started = $state(0)
	let now = $state(0)
	let appliedThisSession = false
	let current: ReturnType<typeof startGeneration> | undefined

	$effect(() => {
		if (open) {
			appliedThisSession = false
		} else {
			current?.detach()
			current = undefined
			busy = false
		}
	})
	$effect(() => {
		if (!busy) return
		const timer = setInterval(() => {
			now = Date.now()
		}, 1000)
		return () => clearInterval(timer)
	})
	onDestroy(() => current?.detach())

	async function generate(event: SubmitEvent) {
		event.preventDefault()
		if (busy) return
		const original = source
		const form = new FormData(event.currentTarget as HTMLFormElement)
		form.set('source', JSON.stringify(original))
		form.set('target', target)
		if (target === 'fields') {
			form.set('file', file)
			form.set('fields', JSON.stringify(selected))
		}
		phase = 'preparation'
		started = Date.now()
		now = started
		busy = true
		appliedThisSession = false
		const operation = startGeneration(form, (event) => {
			if (!open) return
			if (event.type === 'phase') {
				const latest = event.data.at(-1)
				phase = latest?.phase ?? 'generation'
			}
		})
		current = operation
		try {
			const result = await operation.result
			if (!open || current !== operation || !result) return
			onApply(original, result.markdown)
			target = 'fields'
			selected = [...fields]
			fieldInstructions = undefined
			bodyInstructions = ''
			files = new DataTransfer().files
			appliedThisSession = true
			open = false
		} catch (cause) {
			if (open && current === operation) {
				onError(cause instanceof Error ? cause.message : 'Generation failed.')
				open = false
			}
		} finally {
			if (current === operation) {
				current = undefined
				busy = false
			}
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open: visible })}
				{#if visible}<div
						class="dialogOverlay"
						{...props}
						transition:fade={{ duration: 150 }}
					></div>{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content
			forceMount
			onOpenAutoFocus={async (event) => {
				if (target !== 'fields') return
				event.preventDefault()
				await tick()
				if (open) fieldPicker?.focus()
			}}
			onCloseAutoFocus={(event) => {
				if (appliedThisSession) {
					event.preventDefault()
					onFocusEditor()
				}
			}}
		>
			{#snippet child({ props, open: visible })}
				{#if visible}
					<div class="dialogContent" {...props} transition:fly={{ y: 100, duration: 250 }}>
						<div class="drawer-handle"></div>
						<Dialog.Title class="generation-a11y">Generate content</Dialog.Title>
						<form onsubmit={generate} class="generation-form">
							<Tabs.Root bind:value={target} disabled={busy}>
								<Tabs.List class="generation-tabs" aria-label="What to generate">
									<Tabs.Trigger class="generation-tab" value="fields">Metadata</Tabs.Trigger>
									<Tabs.Trigger class="generation-tab" value="body">Body</Tabs.Trigger>
								</Tabs.List>
								<div class="generation-body">
									<div class="generation-inputs" class:concealed={busy} inert={busy}>
										<Tabs.Content value="fields" class="generation-panel">
											<GenerationFields
												bind:this={fieldPicker}
												{fields}
												bind:selected
												disabled={busy}
											/>
										</Tabs.Content>
										<Tabs.Content value="body" class="generation-panel">
											<p class="hint">Append new text to the body; keep existing content.</p>
										</Tabs.Content>
										<fieldset disabled={busy}>
											<legend class="visually-hidden">Instructions and reference files</legend>
											<div class="input-group">
												<label for={`${id}-instructions`} class="field-label">Instructions</label>
												{#if target === 'fields'}
													<!-- prettier-ignore -->
													<textarea
														id={`${id}-instructions`}
														class="input"
														name="instructions"
														bind:value={fieldInstructions}
														rows="4"
														>Use the current piece and attached files to fill in or improve the selected fields. add or replace fields with accurate information, preserve values that are already correct, and avoid inventing details.</textarea
													>
												{:else}
													<textarea
														id={`${id}-instructions`}
														class="input"
														name="instructions"
														bind:value={bodyInstructions}
														placeholder="What would you like to add to the body?"
														rows="4"
													></textarea>
												{/if}
											</div>
											<div class="file-picker-container">
												<span class="field-label">Attachments (optional)</span>
												<input
													id={`${id}-files`}
													class="visually-hidden"
													type="file"
													name="files"
													multiple
													bind:files
													accept="application/pdf, application/json, text/html, .txt, image/png, image/jpeg, .csv"
												/>
												<label
													for={`${id}-files`}
													class="file-dropzone"
													class:has-file={selectedFiles.length > 0}
												>
													{#if selectedFiles.length > 0}
														<span class="file-size">
															{selectedFiles.length}
															{selectedFiles.length === 1 ? 'file' : 'files'} ·
															{totalFileBytes >= 1024 * 1024
																? `${(totalFileBytes / (1024 * 1024)).toFixed(1)} MB`
																: `${(totalFileBytes / 1024).toFixed(1)} KB`}
														</span>
													{:else}<span class="file-prompt">Choose files…</span>{/if}
												</label>
												<button
													type="button"
													class="clear-files"
													class:empty={selectedFiles.length === 0}
													disabled={selectedFiles.length === 0}
													onclick={() => {
														files = new DataTransfer().files
													}}>Remove files</button
												>
											</div>
										</fieldset>
									</div>
									{#if busy}
										<div class="generation-progress">
											<div class="progress">
												<CircleNotch class="generation-spin" aria-hidden="true" />
												<span role="status">
													{#if phase === 'preparation'}
														{#if selectedFiles.length > 0}Preparing files…{:else}Getting ready…{/if}
													{:else if phase === 'validation'}Checking the result…
													{:else}Generating content…{/if}
												</span>
												<span class="elapsed">{Math.floor((now - started) / 1000)}s</span>
											</div>
										</div>
									{/if}
								</div>
							</Tabs.Root>
							<div class="actions">
								<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
								<Button
									type="submit"
									disabled={busy || (target === 'fields' && selected.length === 0)}>Generate</Button
								>
							</div>
						</form>
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.dialogOverlay {
		position: fixed;
		inset: 0;
		background: color-mix(in srgb, var(--color-surface-dim) 40%, transparent);
		backdrop-filter: blur(4px);
		z-index: 1000;
	}
	.dialogContent {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		max-width: 520px;
		max-height: 90dvh;
		overflow-y: auto;
		background: var(--color-surface);
		color: var(--color-on-surface);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-medium);
		padding: var(--space-4);
		box-shadow: var(--shadow-raised);
		z-index: 1001;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.generation-form,
	.generation-inputs {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.generation-body {
		position: relative;
	}
	.generation-inputs.concealed {
		visibility: hidden;
	}
	.generation-progress {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.generation-form :global(.generation-tabs) {
		display: flex;
		border-bottom: 1px solid var(--color-outline);
		margin-bottom: var(--space-3);
	}
	.generation-form :global(.generation-tab) {
		flex: 1;
		padding: var(--space-2) var(--space-4);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--color-on-surface);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		opacity: 0.7;
	}
	.generation-form :global(.generation-tab[data-state='active']) {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		opacity: 1;
		font-weight: 600;
	}
	.generation-form :global(.generation-tab:disabled) {
		cursor: default;
		opacity: 0.5;
	}
	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.input-group,
	.file-picker-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.field-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-on-surface);
	}
	.input {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-small);
		background: var(--color-surface-container);
		color: var(--color-on-surface);
		font-size: 0.875rem;
		box-sizing: border-box;
	}
	.input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	textarea {
		resize: vertical;
		min-height: 100px;
	}
	.file-dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border: 2px dashed var(--color-outline);
		border-radius: var(--radius-small);
		padding: var(--space-6) var(--space-4);
		text-align: center;
		cursor: pointer;
		min-height: 100px;
		box-sizing: border-box;
	}
	.file-dropzone:hover {
		background: var(--color-surface-container-low);
		border-color: var(--color-primary);
	}
	.file-dropzone.has-file {
		border-style: solid;
		border-color: var(--color-primary);
		background: var(--color-surface-container-low);
	}
	.file-picker-container input:focus-visible + .file-dropzone {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	fieldset:disabled .file-dropzone {
		opacity: 0.5;
		cursor: default;
	}
	.file-prompt,
	.file-size {
		font-size: 0.875rem;
		color: var(--color-on-surface-variant);
	}
	.clear-files {
		font-size: 0.75rem;
		color: var(--color-primary);
		text-decoration: underline;
	}
	.clear-files {
		align-self: flex-end;
		padding: 0;
		background: none;
		border: 0;
		cursor: pointer;
	}
	.clear-files.empty {
		visibility: hidden;
	}
	.clear-files:disabled {
		cursor: default;
		opacity: 0.5;
	}
	.hint {
		margin: var(--space-2) 0 0;
		font-size: 0.75rem;
		color: var(--color-on-surface-variant);
	}
	.actions,
	.progress {
		display: flex;
		gap: var(--space-3);
	}
	.actions {
		justify-content: flex-end;
	}
	.progress {
		align-items: center;
	}
	.elapsed {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}
	.progress :global(.generation-spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.visually-hidden,
	.dialogContent :global(.generation-a11y) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.drawer-handle {
		display: none;
	}
	@media (max-width: 767px) {
		.drawer-handle {
			display: block;
			width: 36px;
			height: 4px;
			background: var(--color-outline);
			border-radius: 2px;
			margin: 0 auto var(--space-3);
		}
		.dialogContent {
			top: auto;
			bottom: 0;
			left: 0;
			transform: none;
			width: 100%;
			max-width: 100%;
			border-radius: var(--radius-medium) var(--radius-medium) 0 0;
			padding: var(--space-4) var(--space-6) max(var(--space-6), env(safe-area-inset-bottom));
			border-bottom: none;
			border-left: none;
			border-right: none;
		}
		.file-dropzone {
			padding: var(--space-3) var(--space-4);
			min-height: 60px;
		}
		.generation-form :global(.generation-tab) {
			padding: var(--space-2);
		}
	}
</style>
