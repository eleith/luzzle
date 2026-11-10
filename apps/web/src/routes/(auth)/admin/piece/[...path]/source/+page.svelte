<script lang="ts">
	import { deserialize, enhance, type SubmitFunction } from '$app/forms'
	import MarkdownEditor from '#lib/components/editor/MarkdownEditor.svelte'
	import Button from '#lib/components/ui/Button.svelte'
	import PieceActions from '#lib/components/editor/PieceActions.svelte'
	import PieceToolbar from '#lib/components/editor/PieceToolbar.svelte'
	import PublicationStatus from '#lib/components/editor/PublicationStatus.svelte'
	import {
		submitPublication,
		getPublicationState,
		type PublicationAction,
		type PublicationOutcome
	} from '#lib/pieces/publication-client.js'
	import { editorHref } from '#lib/pieces/navigation.js'
	import {
		MarkdownPublicationStatus,
		type PiecePublicationState,
		type EditorPublicationStatus
	} from '#lib/pieces/types.js'
	import GenerationDialog from '#lib/components/editor/GenerationDialog.svelte'
	import type { PageProps } from './$types'
	import { Dialog } from 'bits-ui'
	import { fade, fly } from 'svelte/transition'
	import { navigating, page } from '$app/state'
	import { beforeNavigate, goto } from '$app/navigation'
	import { onMount, onDestroy, untrack } from 'svelte'

	let { data, form }: PageProps = $props()
	const saveFormId = $props.id()
	let saveForm = $state<HTMLFormElement>()
	let targetUrl = $state<string | null>(null)
	let showWarningDialog = $state(false)
	let bypassWarning = $state(false)
	let isSaving = $state(false)
	let editorErrorReason = $state<
		'sign-in' | 'save' | 'format' | 'navigation' | 'generation-url' | 'delete-refresh' | null
	>(null)
	let editorErrorDetail = $state('')
	let disposed = false
	let activePublication: AbortController | undefined
	let publicationRead: AbortController | undefined
	let activeFormat = $state<AbortController>()

	onDestroy(() => {
		disposed = true
		activePublication?.abort()
		publicationRead?.abort()
		activeFormat?.abort()
	})

	beforeNavigate((navigation) => {
		if (navigation.shallow && navigation.type === 'goto') return

		if (isDirty && !bypassWarning && navigation.type !== 'form' && navigation.to) {
			navigation.cancel()
			targetUrl = navigation.to.url.pathname + navigation.to.url.search + navigation.to.url.hash
			showWarningDialog = true
		}
	})

	async function confirmDiscard() {
		if (!targetUrl) return
		const file = data.file
		bypassWarning = true
		showWarningDialog = false
		try {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- The navigation guard captured an already resolved router URL.
			await goto(targetUrl)
		} catch {
			if (!disposed && data.file === file) {
				editorErrorReason = 'navigation'
				editorErrorDetail = ''
			}
		} finally {
			if (!disposed && data.file === file) bypassWarning = false
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
	let vimEnabled = $state(false)
	let publicationAction = $state<PublicationAction>('publish')
	let publicationRunning = $state(false)
	let publicationOutcome = $state<PublicationOutcome | null>(null)
	let publicationRefreshFailed = $state(false)
	let publicationState = $state<PiecePublicationState>(
		untrack(() => ({
			hasPublishedVersion: data.hasPublishedVersion,
			markdownPublicationStatus: data.markdownPublicationStatus
		}))
	)
	const hasPublishedVersion = $derived(publicationState.hasPublishedVersion)
	const markdownPublicationStatus = $derived(publicationState.markdownPublicationStatus)
	const isPublishing = $derived(publicationRunning && publicationAction === 'publish')
	const isUnpublishing = $derived(publicationRunning && publicationAction === 'unpublish')

	function initialRawContent(): string {
		if (form && 'rawContent' in form) {
			if (typeof form.rawContent === 'string') return form.rawContent
		}
		if (data.rawContent != null) return data.rawContent
		return ''
	}

	let rawContent = $state(initialRawContent())
	let savedSource = $state(untrack(() => ({ file: data.file, content: data.rawContent ?? '' })))
	let activeSave: { file: string; content: string } | undefined

	function saveFromVim() {
		if (isDirty && !isSaving) saveForm?.requestSubmit()
	}

	const enhanceSave: SubmitFunction = ({ formData, cancel }) => {
		if (isSaving) {
			cancel()
			return
		}
		const submitted = { file: data.file, content: rawContent }
		formData.set('content', submitted.content)
		activeSave = submitted
		isSaving = true
		form = null
		editorErrorReason = null
		editorErrorDetail = ''
		const isCurrentSave = () =>
			!disposed && activeSave === submitted && data.file === submitted.file
		return async ({ result }) => {
			if (!isCurrentSave()) return
			try {
				if (result.type === 'success') {
					savedSource = submitted
					await refreshPublicationState()
				} else if (result.type === 'failure') {
					form = result.data as PageProps['form']
				} else if (result.type === 'redirect') {
					const destination = new URL(result.location, page.url.href)
					if (destination.origin === page.url.origin && destination.pathname === '/signin') {
						editorErrorReason = 'sign-in'
					} else {
						editorErrorReason = 'save'
					}
				} else {
					editorErrorReason = 'save'
				}
			} catch {
				if (isCurrentSave()) editorErrorReason = 'save'
			} finally {
				if (isCurrentSave()) {
					activeSave = undefined
					isSaving = false
					bypassWarning = false
				}
			}
		}
	}

	async function handleFormat() {
		if (isSaving || activeFormat) return
		const file = data.file
		const source = rawContent
		const controller = new AbortController()
		activeFormat = controller
		editorErrorReason = null
		editorErrorDetail = ''
		const isCurrent = () => !disposed && activeFormat === controller && data.file === file
		try {
			const body = new FormData()
			body.set('content', source)
			const response = await fetch(`${sourceUrl}?/format`, {
				method: 'POST',
				headers: { accept: 'application/json', 'x-sveltekit-action': 'true' },
				body,
				signal: controller.signal
			})
			if (!isCurrent()) return
			if (response.redirected || response.status === 401 || response.status === 403) {
				editorErrorReason = 'sign-in'
				return
			}
			const result = deserialize(await response.text())
			if (!isCurrent()) return
			if (result.type !== 'success' && result.type !== 'failure') {
				editorErrorReason = 'format'
				return
			}
			const formatted = result.data as
				| {
						formattedContent?: string
						error?: { message?: string }
				  }
				| undefined
			if (result.type !== 'success' || typeof formatted?.formattedContent !== 'string') {
				editorErrorReason = 'format'
				editorErrorDetail = formatted?.error?.message ?? ''
				return
			}
			if (formatted.formattedContent !== source) {
				editorRef?.replaceContent(formatted.formattedContent, source)
			}
			editorRef?.focus()
		} catch (error) {
			if (isCurrent()) {
				editorErrorReason = 'format'
				editorErrorDetail = error instanceof Error ? error.message : String(error)
			}
		} finally {
			if (isCurrent()) activeFormat = undefined
		}
	}

	const hasChanges = $derived(rawContent !== savedSource.content)
	const isDirty = $derived(!!form?.error || hasChanges)
	const publishDisabled = $derived(isDirty || isSaving || publicationRunning)
	const unpublishDisabled = $derived(publishDisabled || !hasPublishedVersion)
	const sourceUrl = $derived(editorHref(data.file))
	const publicationStatus = $derived.by((): EditorPublicationStatus => {
		if (isPublishing) return 'publishing'
		if (isUnpublishing) return 'unpublishing'
		if (publicationRefreshFailed) return 'unknown'
		if (!hasPublishedVersion) return 'unpublished'
		if (isDirty || isSaving || markdownPublicationStatus === MarkdownPublicationStatus.CHANGED)
			return 'changed'
		if (markdownPublicationStatus === MarkdownPublicationStatus.MATCHING) return 'published'
		return 'unknown'
	})

	async function refreshPublicationState() {
		publicationRead?.abort()
		const reader = new AbortController()
		const file = data.file
		publicationRead = reader
		const isCurrent = () => !disposed && publicationRead === reader && data.file === file
		try {
			const state = await getPublicationState(file, reader.signal)
			if (isCurrent()) {
				publicationState = state
				publicationRefreshFailed = false
			}
		} catch {
			if (isCurrent()) publicationRefreshFailed = true
		} finally {
			if (isCurrent()) publicationRead = undefined
		}
	}

	async function handlePublication(action: PublicationAction) {
		if (action === 'publish' && publishDisabled) return
		if (action === 'unpublish' && unpublishDisabled) return
		const file = data.file
		const observer = new AbortController()
		activePublication = observer
		publicationAction = action
		publicationRunning = true
		publicationOutcome = null
		publicationRefreshFailed = false
		const isCurrent = () => !disposed && activePublication === observer && data.file === file
		try {
			const result = await submitPublication(action, file, observer.signal)
			if (!isCurrent() || !result) return
			publicationOutcome = result
			if (!result.jobId) return
			if (result.state === 'failed' && result.reason === 'sign-in') return
			if (navigating.to) return
			await refreshPublicationState()
		} finally {
			if (isCurrent()) {
				activePublication = undefined
				publicationRunning = false
			}
		}
	}

	$effect(() => {
		const file = data.file
		untrack(() => {
			if (file === savedSource.file) return

			savedSource = { file, content: data.rawContent ?? '' }
			rawContent = savedSource.content
			form = null
			activeFormat?.abort()
			activeFormat = undefined
			attachDialogOpen = false
			resetAttachState()
			publicationRead?.abort()
			publicationRead = undefined
			publicationState = {
				hasPublishedVersion: data.hasPublishedVersion,
				markdownPublicationStatus: data.markdownPublicationStatus
			}
			activeSave = undefined
			isSaving = false
			activePublication?.abort()
			activePublication = undefined
			publicationRunning = false
			publicationAction = 'publish'
			publicationOutcome = null
			publicationRefreshFailed = false
			bypassWarning = false
		})
	})

	let generateDialogOpen = $state(false)

	$effect(() => {
		if (data.file) {
			generateDialogOpen = false
			editorErrorReason = null
			editorErrorDetail = ''
		}
	})
	$effect(() => {
		const currentUrl = page.shallow?.url ?? page.url
		if (currentUrl.searchParams.get('generate') !== '1') return
		untrack(() => {
			const file = data.file
			generateDialogOpen = data.canGenerate
			const url = new URL(currentUrl.href)
			url.searchParams.delete('generate')
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- Only the query changes on the already resolved router URL.
			void goto(url, { shallow: true, replace: true, state: page.state }).catch(() => {
				if (!disposed && data.file === file) {
					editorErrorReason = 'generation-url'
					editorErrorDetail = ''
				}
			})
		})
	})

	let attachDialogOpen = $state(false)
	let activeTab = $state<'file' | 'url' | 'create'>('file')
	let selectedFile = $state<File | null>(null)
	let urlValue = $state('')
	let customName = $state('')
	let isNameManuallyEdited = $state(false)
	let isUploading = $state(false)
	let uploadErrorReason = $state<
		'file-required' | 'url-required' | 'filename-required' | 'failed' | null
	>(null)

	let uploadErrorDetail = $state<string | null>(null)
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
			} catch {
				return
			}
		}
	})

	function openAttachDialog() {
		const selectedText = editorRef?.getSelectedText()?.trim() || ''
		let isUrl = false
		if (selectedText.startsWith('http://') || selectedText.startsWith('https://')) {
			try {
				new URL(selectedText)
				isUrl = true
			} catch {
				isUrl = false
			}
		}

		if (isUrl) {
			activeTab = 'url'
			urlValue = selectedText
		} else {
			activeTab = 'file'
		}
		attachDialogOpen = true
	}

	function resetAttachState() {
		selectedFile = null
		urlValue = ''
		customName = ''
		isNameManuallyEdited = false
		uploadErrorReason = null
		uploadErrorDetail = null
		isUploading = false
	}

	async function handleAttachSubmit(e: Event) {
		e.preventDefault()
		uploadErrorReason = null
		uploadErrorDetail = null
		if (activeTab === 'file' && !selectedFile) {
			uploadErrorReason = 'file-required'
			return
		}
		if (activeTab === 'url' && !urlValue) {
			uploadErrorReason = 'url-required'
			return
		}
		if (activeTab === 'create' && !customName.trim()) {
			uploadErrorReason = 'filename-required'
			return
		}

		isUploading = true
		const file = data.file
		const editor = editorRef
		const isCurrent = () => !disposed && data.file === file && editorRef === editor

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
			const response = await fetch(`${sourceUrl}?/attach`, { method: 'POST', body: formData })
			const result = deserialize(await response.text())
			if (!isCurrent()) return

			if (result.type === 'success' || result.type === 'failure') {
				const resData = result.data as { error?: { message?: string }; path?: string } | undefined
				if (result.type === 'success' && resData?.path) {
					editorRef?.insertText(resData.path)
					attachDialogOpen = false
					resetAttachState()
				} else {
					uploadErrorDetail = resData?.error?.message || null
					if (!uploadErrorDetail) uploadErrorReason = 'failed'
				}
			} else {
				uploadErrorReason = 'failed'
			}
		} catch (err) {
			if (isCurrent()) uploadErrorDetail = err instanceof Error ? err.message : String(err)
		} finally {
			if (isCurrent()) isUploading = false
		}
	}
</script>

{#key data.file}
	<GenerationDialog
		bind:open={generateDialogOpen}
		file={data.file}
		source={rawContent}
		fields={Object.keys(data.schema.properties ?? {}).filter((key) => key !== '__proto__')}
		onFocusEditor={() => editorRef?.focus()}
		onError={(message) => {
			editorErrorReason = null
			editorErrorDetail = message
		}}
		onApply={(source, markdown) => {
			if (!editorRef) throw new Error('The editor is not ready. Please try again.')
			editorRef.replaceContent(markdown, source)
			editorErrorReason = null
			editorErrorDetail = ''
		}}
	/>
{/key}

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

							{#if uploadErrorReason || uploadErrorDetail}
								<div class="dialog-error">
									{#if uploadErrorReason === 'file-required'}
										Please select a file to upload.
									{:else if uploadErrorReason === 'url-required'}
										Please enter a URL.
									{:else if uploadErrorReason === 'filename-required'}
										Please enter a filename.
									{:else if uploadErrorReason === 'failed'}
										Attachment failed
									{:else}
										{uploadErrorDetail}
									{/if}
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
		action="{sourceUrl}?/delete"
		use:enhance={() => {
			const file = data.file
			bypassWarning = true
			return async ({ update }) => {
				if (disposed || data.file !== file) return
				dialog.close()
				try {
					await update()
				} catch {
					if (!disposed && data.file === file) {
						editorErrorReason = 'delete-refresh'
						editorErrorDetail = ''
					}
				} finally {
					if (!disposed && data.file === file) bypassWarning = false
				}
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
	<form
		id={saveFormId}
		bind:this={saveForm}
		hidden
		method="post"
		action="{sourceUrl}?/save"
		use:enhance={enhanceSave}
	>
		<input type="hidden" name="content" value={rawContent} />
	</form>
	{#if editorErrorReason || editorErrorDetail || form?.error}
		<div class="banner error-banner" role="alert">
			<strong>Error:</strong>
			{#if editorErrorReason === 'sign-in'}
				Please sign in again in another tab, then retry. Your edits are still here.
			{:else if editorErrorReason === 'save'}
				Unable to save. Your edits are still here. Please try again.
			{:else if editorErrorReason === 'format'}
				Unable to format. Your edits are still here.
				{#if editorErrorDetail}<pre class="error-details">{editorErrorDetail}</pre>{/if}
			{:else if editorErrorReason === 'navigation'}
				Unable to leave this page. Your edits are still here.
			{:else if editorErrorReason === 'generation-url'}
				Unable to clear the generation link from the URL.
			{:else if editorErrorReason === 'delete-refresh'}
				Unable to finish deleting this piece. Please reload to confirm its status.
			{:else}
				{editorErrorDetail || form?.error?.message}
			{/if}
		</div>
	{/if}

	{#if publicationOutcome?.state === 'failed' || publicationRefreshFailed}
		<div class="banner error-banner" role="alert">
			{#if publicationOutcome?.state === 'failed'}
				{#if publicationOutcome.reason === 'busy'}
					Another publication operation is running.
				{:else if publicationOutcome.reason === 'sign-in'}
					Please sign in again in another tab. Your edits are still here.
				{:else if publicationOutcome.reason === 'job'}
					{#if publicationAction === 'unpublish' && !hasPublishedVersion}
						Unpublished, but cleanup did not complete.
					{:else if publicationAction === 'publish'}
						Publish did not complete.
					{:else}
						Unpublish did not complete.
					{/if}
				{:else if publicationOutcome.reason === 'connection'}
					Unable to confirm completion. The job may still be running.
				{:else if publicationOutcome.reason === 'response'}
					{#if publicationAction === 'publish'}
						Could not read the Publish response. The job may have been accepted.
					{:else}
						Could not read the Unpublish response. The job may have been accepted.
					{/if}
				{:else if publicationAction === 'publish'}
					Unable to confirm the Publish request.
				{:else}
					Unable to confirm the Unpublish request.
				{/if}
				{#if publicationOutcome.detail}<pre
						class="error-details">{publicationOutcome.detail}</pre>{/if}
			{/if}
			{#if publicationRefreshFailed}
				<p>Unable to refresh publication status. Your edits are still here.</p>
			{/if}
		</div>
	{/if}

	<div class="editor-container">
		{#key data.file}
			<MarkdownEditor
				bind:this={editorRef}
				bind:value={rawContent}
				onSave={saveFromVim}
				file={data.file}
				returnTo={page.url.pathname}
				assetFields={data.assetFields}
				bind:vimEnabled
			>
				{#snippet toolbar()}
					<PieceToolbar
						{saveFormId}
						{isDirty}
						{isSaving}
						{publishDisabled}
						{publicationStatus}
						onPublish={() => handlePublication('publish')}
					>
						<PieceActions
							file={data.file}
							canGenerate={data.canGenerate}
							disabled={isSaving}
							{hasPublishedVersion}
							previewDisabled={isDirty || isSaving}
							{publishDisabled}
							onPublish={() => handlePublication('publish')}
							{unpublishDisabled}
							{vimEnabled}
							onVimChange={(enabled) => {
								vimEnabled = enabled
							}}
							onEditorFocus={() => editorRef?.focus()}
							onFormat={handleFormat}
							formatDisabled={isSaving || !!activeFormat}
							onUnpublish={() => handlePublication('unpublish')}
							onDelete={() => dialog.showModal()}
							onGenerate={() => {
								editorErrorReason = null
								editorErrorDetail = ''
								generateDialogOpen = true
							}}
							onAttach={openAttachDialog}
						/>
					</PieceToolbar>
				{/snippet}
				{#snippet footer()}
					<PublicationStatus
						status={publicationStatus}
						{hasPublishedVersion}
						{isDirty}
						{isSaving}
					/>
				{/snippet}
			</MarkdownEditor>
		{/key}
	</div>
</div>

<style>
	.piece-page {
		margin: 0;
		width: 100%;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.editor-container {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.banner {
		flex-shrink: 0;
		max-height: 25%;
		overflow: auto;
		box-sizing: border-box;
		padding: var(--space-3);
		border-radius: var(--radius-small);
		margin-bottom: var(--space-2);
		font-size: 0.875rem;
	}

	.error-banner {
		background-color: var(--color-error-container);
		color: var(--color-on-error-container);
		border: 1px solid var(--color-error);
	}

	.error-details {
		margin: var(--space-2) 0 0;
		font: inherit;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
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
			margin: var(--space-1) auto 0;
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
