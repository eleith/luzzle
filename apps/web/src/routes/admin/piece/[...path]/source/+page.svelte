<script lang="ts">
	import { deserialize, enhance } from '$app/forms'
	import MarkdownEditor from '$lib/components/editor/MarkdownEditor.svelte'
	import Button from '$lib/components/ui/Button.svelte'
	import PieceActions from '$lib/components/editor/PieceActions.svelte'
	import type { PageProps } from './$types'
	import { Dialog } from 'bits-ui'
	import { fade, fly } from 'svelte/transition'

	import { page } from '$app/state'
	import { beforeNavigate, goto } from '$app/navigation'
	import { onMount } from 'svelte'

	let { data, form }: PageProps = $props()

	let targetUrl = $state<string | null>(null)
	let showWarningDialog = $state(false)
	let bypassWarning = $state(false)
	let isSaving = $state(false)
	let saveSuccess = $state(false)

	beforeNavigate((navigation) => {
		if (isDirty && !bypassWarning && navigation.type !== 'form' && navigation.to) {
			navigation.cancel()
			targetUrl = navigation.to.url.pathname + navigation.to.url.search + navigation.to.url.hash
			showWarningDialog = true
		}
	})

	function confirmDiscard() {
		bypassWarning = true
		showWarningDialog = false
		if (targetUrl) {
			goto(targetUrl)
		}
	}

	onMount(() => {
		const handleUnload = (e: BeforeUnloadEvent) => {
			if (isDirty) {
				e.preventDefault()
			}
		}
		window.addEventListener('beforeunload', handleUnload)
		return () => window.removeEventListener('beforeunload', handleUnload)
	})

	let dialog: HTMLDialogElement
	let editorRef = $state<MarkdownEditor>()

	let rawContent = $state<string>(
		(form && 'rawContent' in form ? (form.rawContent as string) : undefined) ||
			data.rawContent ||
			''
	)

	const hasChanges = $derived(rawContent !== (data.rawContent ?? ''))
	const isDirty = $derived(!!form?.error || (hasChanges && !isSaving))

	$effect(() => {
		if (form && 'rawContent' in form && form.rawContent) {
			rawContent = form.rawContent as string
		} else {
			rawContent = data.rawContent || ''
		}
	})

	let attachDialogOpen = $state(false)
	let activeTab = $state<'file' | 'url' | 'create'>('file')
	let selectedFile = $state<File | null>(null)
	let urlValue = $state('')
	let customName = $state('')
	let isNameManuallyEdited = $state(false)
	let isUploading = $state(false)
	let uploadError = $state<string | null>(null)
	let fileInputRef = $state<HTMLInputElement>()

	function getBasenameWithoutExtension(filename: string): string {
		const parts = filename.split('/')
		const last = parts[parts.length - 1]
		const dotIndex = last.lastIndexOf('.')
		if (dotIndex === -1) return last
		return last.substring(0, dotIndex)
	}

	$effect(() => {
		if (selectedFile && !isNameManuallyEdited) {
			customName = getBasenameWithoutExtension(selectedFile.name)
		}
	})

	$effect(() => {
		if (urlValue && !isNameManuallyEdited) {
			try {
				const url = new URL(urlValue)
				const pathname = url.pathname
				if (pathname && pathname !== '/') {
					customName = getBasenameWithoutExtension(pathname)
				}
			} catch (_) {
				// Invalid URL or incomplete, ignore
			}
		}
	})

	function resetAttachState() {
		selectedFile = null
		urlValue = ''
		customName = ''
		isNameManuallyEdited = false
		uploadError = null
		isUploading = false
	}

	async function handleAttachSubmit(e: Event) {
		e.preventDefault()
		if (activeTab === 'file' && !selectedFile) {
			uploadError = 'Please select a file to upload.'
			return
		}
		if (activeTab === 'url' && !urlValue) {
			uploadError = 'Please enter a URL.'
			return
		}
		if (activeTab === 'create' && !customName.trim()) {
			uploadError = 'Please enter a filename.'
			return
		}

		isUploading = true
		uploadError = null

		const formData = new FormData()
		formData.append('mode', activeTab)
		if (activeTab === 'file' && selectedFile) {
			formData.append('file', selectedFile)
		} else if (activeTab === 'url') {
			formData.append('url', urlValue)
		}
		if (customName.trim()) {
			formData.append('name', customName.trim())
		}

		try {
			const response = await fetch(`/admin/piece/${data.file}/source?/attach`, {
				method: 'POST',
				body: formData
			})

			const result = deserialize(await response.text())
			if (result.type === 'success' || result.type === 'failure') {
				const resData = result.data as { error?: { message?: string }; path?: string } | undefined
				if (result.type === 'success' && resData?.path) {
					editorRef?.insertText(resData.path)
					attachDialogOpen = false
					resetAttachState()
				} else {
					uploadError = resData?.error?.message || 'Attachment failed'
				}
			} else {
				uploadError = 'Attachment failed'
			}
		} catch (err) {
			uploadError = err instanceof Error ? err.message : String(err)
		} finally {
			isUploading = false
		}
	}
</script>

<Dialog.Root
	bind:open={attachDialogOpen}
	onOpenChange={(open) => {
		if (!open) resetAttachState()
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div class="dialogOverlay" {...props} transition:fade={{ duration: 150 }}></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div class="dialogContent" {...props} transition:fly={{ y: 100, duration: 250 }}>
						<div class="drawer-handle"></div>
						<div class="tabs">
							<button
								type="button"
								class="tab-btn"
								class:active={activeTab === 'file'}
								onclick={() => (activeTab = 'file')}
								disabled={isUploading}
							>
								File
							</button>
							<button
								type="button"
								class="tab-btn"
								class:active={activeTab === 'url'}
								onclick={() => (activeTab = 'url')}
								disabled={isUploading}
							>
								URL
							</button>
							<button
								type="button"
								class="tab-btn"
								class:active={activeTab === 'create'}
								onclick={() => (activeTab = 'create')}
								disabled={isUploading}
							>
								Create
							</button>
						</div>

						<form onsubmit={handleAttachSubmit} class="attachForm">
							{#if activeTab === 'file'}
								<div class="file-picker-container">
									<input
										type="file"
										id="dialog-file-upload"
										bind:this={fileInputRef}
										onchange={(e) => {
											const files = (e.target as HTMLInputElement).files
											if (files && files.length > 0) {
												selectedFile = files[0]
											}
										}}
										disabled={isUploading}
										class="visually-hidden"
									/>
									<label
										for="dialog-file-upload"
										class="file-dropzone"
										class:has-file={!!selectedFile}
									>
										{#if selectedFile}
											<div class="file-info">
												<span class="file-name">{selectedFile.name}</span>
												<span class="file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
											</div>
											<span class="file-change-text">Click to change file</span>
										{:else}
											<span class="file-prompt">Choose a file to attach...</span>
										{/if}
									</label>
								</div>
							{:else if activeTab === 'url'}
								<div class="input-group">
									<label for="dialog-url-input" class="field-label">Remote URL</label>
									<input
										type="url"
										id="dialog-url-input"
										placeholder="https://example.com/image.png"
										bind:value={urlValue}
										disabled={isUploading}
										class="input"
										required
									/>
								</div>
							{/if}

							<div class="input-group">
								<label for="dialog-name-input" class="field-label">
									{activeTab === 'create' ? 'Filename' : 'Target Filename (Optional)'}
								</label>
								<div class="filename-input-wrapper">
									<input
										type="text"
										id="dialog-name-input"
										placeholder={activeTab === 'create' ? 'notes.txt' : 'Default name will be used'}
										bind:value={customName}
										oninput={() => {
											isNameManuallyEdited = true
										}}
										disabled={isUploading}
										class="input filename-input"
										required={activeTab === 'create'}
									/>
								</div>
							</div>

							{#if uploadError}
								<div class="dialog-error">
									{uploadError}
								</div>
							{/if}

							<div class="dialog-actions">
								<Button
									variant="outline"
									type="button"
									onclick={() => {
										attachDialogOpen = false
										resetAttachState()
									}}
									disabled={isUploading}
								>
									cancel
								</Button>
								<Button type="submit" disabled={isUploading}>
									{#if isUploading}
										attaching...
									{:else}
										attach
									{/if}
								</Button>
							</div>
						</form>
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<dialog bind:this={dialog}>
	<form
		method="post"
		action="/admin/piece/{data.file}/source?/delete"
		use:enhance={() => {
			bypassWarning = true
			return async ({ update }) => {
				dialog.close()
				await update()
			}
		}}
	>
		<p>Are you sure you want to delete this piece?</p>
		<p>This action cannot be undone.</p>
		<div
			style="display:flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4);"
		>
			<Button variant="outline" type="button" onclick={() => dialog.close()}>cancel</Button>
			<Button variant="error" type="submit">delete</Button>
		</div>
	</form>
</dialog>

<Dialog.Root bind:open={showWarningDialog}>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div class="dialogOverlay" {...props} transition:fade={{ duration: 150 }}></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div class="dialogContent" {...props} transition:fly={{ y: 100, duration: 250 }}>
						<Dialog.Title class="dialogTitle">Unsaved Changes</Dialog.Title>
						<Dialog.Description class="dialogDescription">
							You have unsaved changes. If you leave this page, these changes will be permanently
							lost.
						</Dialog.Description>
						<div class="dialog-actions">
							<Button variant="outline" onclick={() => (showWarningDialog = false)}>stay</Button>
							<Button variant="error" onclick={confirmDiscard}>discard</Button>
						</div>
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<div class="piece-page">
	<div class="header">
		<div style="display:flex; gap: var(--space-2);">
			<form
				method="post"
				action="/admin/piece/{data.file}/source?/save"
				use:enhance={() => {
					isSaving = true
					bypassWarning = true
					saveSuccess = false
					return async ({ result, update }) => {
						isSaving = false
						bypassWarning = false
						if (result.type === 'success') {
							saveSuccess = true
						}
						await update({ reset: false })
					}
				}}
			>
				<input type="hidden" name="content" value={rawContent} />
				<Button type="submit" disabled={!isDirty || isSaving}>
					{isSaving ? 'saving...' : 'save'}
				</Button>
			</form>
			<a href="/admin/directory/{data.directory === '.' ? '' : data.directory}">
				<Button variant="outline">cancel</Button>
			</a>
		</div>
		<PieceActions
			file={data.file}
			currentMode="source"
			{isDirty}
			canGenerate={data.canGenerate}
			onDelete={() => dialog.showModal()}
			onAttach={() => {
				attachDialogOpen = true
			}}
		/>
	</div>

	{#if saveSuccess}
		<div class="banner success-banner">Piece saved successfully!</div>
	{/if}

	{#if form?.error}
		<div class="banner error-banner">
			<strong>Error:</strong>
			{form.error.message}
		</div>
	{/if}

	<div class="editor-container">
		<MarkdownEditor
			bind:this={editorRef}
			bind:value={rawContent}
			file={data.file}
			returnTo={page.url.pathname}
			assetFields={data.assetFields}
		/>
	</div>
</div>

<style>
	.piece-page {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.header {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.banner {
		padding: var(--space-3);
		border-radius: var(--radius-small);
		margin-bottom: var(--space-2);
		font-size: 0.875rem;
	}

	.success-banner {
		background-color: var(--color-success-container, #d4edda);
		color: var(--color-on-success-container, #155724);
		border: 1px solid var(--color-success, #c3e6cb);
	}

	.error-banner {
		background-color: var(--color-error-container);
		color: var(--color-on-error-container);
		border: 1px solid var(--color-error);
	}

	dialog {
		position: fixed;
		transform: translate(-50%, -50%);
		top: 50%;
		left: 50%;
		border: 1px solid var(--color-outline);
		background-color: var(--color-surface);
		color: var(--color-on-surface);
		padding: var(--space-6);
		border-radius: var(--radius-medium);
		box-shadow: var(--shadow-raised);
	}

	dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
	}

	@media screen and (min-width: 768px) {
		.piece-page {
			width: clamp(500px, 66.6666%, 1000px);
		}
	}

	.dialogOverlay {
		position: fixed;
		inset: 0;
		background-color: color-mix(in srgb, var(--color-surface-dim) 40%, transparent);
		backdrop-filter: blur(4px);
		z-index: 1000;
	}

	.dialogContent {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		max-width: 480px;
		background-color: var(--color-surface);
		color: var(--color-on-surface);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-medium);
		padding: var(--space-4);
		box-shadow: var(--shadow-raised);
		z-index: 1001;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.dialogTitle {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-on-surface);
		text-align: center;
	}

	.dialogDescription {
		font-size: 0.875rem;
		color: var(--color-on-surface-variant, #666);
		margin: 0;
	}

	.tabs {
		display: flex;
		border-bottom: 1px solid var(--color-outline);
		margin-bottom: var(--space-2);
		margin-top: calc(-1 * var(--space-2));
	}

	.tab-btn {
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
		transition: all 0.2s ease;
	}

	.tab-btn:hover:not(:disabled) {
		opacity: 1;
	}

	.tab-btn.active {
		border-bottom-color: var(--color-primary, #0066cc);
		opacity: 1;
		font-weight: 600;
	}

	.attachForm {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.input-group {
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
		background-color: var(--color-surface-container);
		color: var(--color-on-surface);
		font-size: 0.875rem;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	.input:focus {
		outline: none;
		border-color: var(--color-primary, #0066cc);
	}

	.file-picker-container {
		display: flex;
		flex-direction: column;
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
		transition:
			background-color 0.2s,
			border-color 0.2s;
		min-height: 100px;
		box-sizing: border-box;
	}

	.file-dropzone:hover {
		background-color: var(--color-surface-container-low, #f5f5f5);
		border-color: var(--color-primary, #0066cc);
	}

	.file-dropzone.has-file {
		border-style: solid;
		border-color: var(--color-success, #28a745);
		background-color: var(--color-success-container, rgba(40, 167, 69, 0.05));
	}

	.file-prompt {
		font-size: 0.875rem;
		color: var(--color-on-surface-variant);
	}

	.file-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: 0.875rem;
		font-weight: 600;
		word-break: break-all;
	}

	.file-change-text {
		margin-top: var(--space-2);
		font-size: 0.75rem;
		color: var(--color-primary, #0066cc);
		text-decoration: underline;
	}

	.filename-input-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.filename-hint {
		font-size: 0.75rem;
		color: var(--color-on-surface-variant);
	}

	.filename-preview {
		font-weight: 600;
		color: var(--color-on-surface);
	}

	.dialog-error {
		font-size: 0.875rem;
		color: var(--color-on-error-container);
		background-color: var(--color-error-container);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-small);
		padding: var(--space-2) var(--space-3);
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.dialogHeader {
		display: flex;
		flex-direction: column;
	}

	.dialogSeparator {
		display: block;
		height: 1px;
		background-color: var(--color-outline-variant, var(--color-outline));
		margin-left: calc(-1 * var(--space-4));
		margin-right: calc(-1 * var(--space-4));
		margin-top: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.dialogCloseBtn {
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		background: transparent;
		border: none;
		box-shadow: none;
		color: var(--color-on-surface);
		opacity: 0.6;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.2s;
	}

	.dialogCloseBtn:hover {
		opacity: 1;
	}

	.drawer-handle {
		display: none;
	}

	@media (max-width: 767px) {
		.dialogHeader,
		.dialogCloseBtn {
			display: none;
		}

		.drawer-handle {
			display: block;
			width: 36px;
			height: 4px;
			background-color: var(--color-outline);
			border-radius: 2px;
			margin: 0 auto;
			margin-bottom: var(--space-3);
		}

		.dialogContent {
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			transform: none;
			width: 100%;
			max-width: 100%;
			border-radius: var(--radius-medium) var(--radius-medium) 0 0;
			padding: var(--space-4) var(--space-6) max(var(--space-6), env(safe-area-inset-bottom))
				var(--space-6);
			border-bottom: none;
			border-left: none;
			border-right: none;
		}

		.file-dropzone {
			padding: var(--space-3) var(--space-4);
			min-height: 60px;
		}

		.tab-btn {
			padding: var(--space-2) var(--space-2);
		}
	}
</style>
