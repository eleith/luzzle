<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { enhance, type SubmitFunction } from '$app/forms'
	import { Dialog } from 'bits-ui'
	import { fade, fly } from 'svelte/transition'
	import { beforeNavigate, goto } from '$app/navigation'
	import Button from '#lib/components/ui/Button.svelte'
	import type { PageProps } from './$types'
	import { EditorView } from 'codemirror'
	import { EditorState, Compartment } from '@codemirror/state'
	import { configuredTheme } from '#lib/components/editor/themes/configured.js'
	import { editorKeybindings } from '#lib/components/editor/keybindings.js'
	import {
		highlightSpecialChars,
		drawSelection,
		dropCursor,
		highlightActiveLine,
		keymap
	} from '@codemirror/view'

	import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
	import { indentWithTab } from '@codemirror/commands'
	import { bracketMatching } from '@codemirror/language'
	import { languages } from '@codemirror/language-data'

	let { data }: PageProps = $props()
	let editorContainer = $state<HTMLDivElement>()
	let view = $state<EditorView | null>(null)
	let editorContent = $state(data.content || '')
	let isSaving = $state(false)
	let saveError = $state<string | null>(null)
	let saveErrorReason = $state<
		'navigation' | 'delete' | 'delete-refresh' | 'sign-in' | 'save' | 'refresh' | null
	>(null)
	let saveSuccess = $state(false)
	const isEditable = $derived(
		data.exists && !data.isBinary && data.content !== null && data.content !== undefined
	)
	const hasChanges = $derived(editorContent !== data.content)
	const isDirty = $derived(isEditable && hasChanges)
	let targetUrl = $state<string | null>(null)
	let showWarningDialog = $state(false)
	let bypassWarning = $state(false)
	let showDeleteDialog = $state(false)
	let isDeleting = $state(false)
	let disposed = false

	onDestroy(() => {
		disposed = true
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
		const file = data.path
		bypassWarning = true
		showWarningDialog = false
		try {
			await goto(targetUrl)
		} catch {
			if (!disposed && data.path === file) {
				saveErrorReason = 'navigation'
				saveError = null
			}
		} finally {
			if (!disposed) bypassWarning = false
		}
	}

	const enhanceSave: SubmitFunction = ({ cancel }) => {
		if (isSaving) {
			cancel()
			return
		}
		const file = data.path
		isSaving = true
		saveError = null
		saveErrorReason = null
		saveSuccess = false
		return async ({ result, update }) => {
			if (disposed) return
			try {
				if (data.path !== file) return
				if (result.type === 'success') {
					await update({ reset: false, navigate: false })
					if (!disposed && data.path === file) saveSuccess = true
				} else if (result.type === 'failure') {
					const failure = result.data as { error?: { message?: string } } | undefined
					saveError = failure?.error?.message || 'Failed to save'
				} else if (result.type === 'redirect') {
					const destination = new URL(result.location, window.location.href)
					if (destination.origin === window.location.origin && destination.pathname === '/signin') {
						saveErrorReason = 'sign-in'
					} else {
						await update()
					}
				} else {
					saveErrorReason = 'save'
				}
			} catch {
				if (!disposed && data.path === file) {
					saveErrorReason = 'refresh'
				}
			} finally {
				if (!disposed) isSaving = false
			}
		}
	}

	const enhanceDelete: SubmitFunction = () => {
		const file = data.path
		isDeleting = true
		bypassWarning = true
		showDeleteDialog = false
		saveError = null
		saveErrorReason = null
		return async ({ result, update }) => {
			if (disposed) return
			try {
				if (data.path !== file) return
				if (result.type === 'failure') {
					const failure = result.data as { error?: { message?: string } } | undefined
					saveError = failure?.error?.message || null
					saveErrorReason = 'delete'
				}
				await update()
			} catch {
				if (!disposed && data.path === file) {
					saveErrorReason = 'delete-refresh'
					saveError = null
				}
			} finally {
				if (!disposed) {
					isDeleting = false
					bypassWarning = false
				}
			}
		}
	}

	const sortedLanguages = [...languages].sort((a, b) => a.name.localeCompare(b.name))

	// Run auto-detection to set initial selection
	const ext = data.filename.split('.').pop()?.toLowerCase()
	let initialLang = 'Plain Text'
	if (ext) {
		const langDesc = languages.find(
			(l) =>
				l.name.toLowerCase() === ext ||
				l.extensions.includes(ext) ||
				(l.filename && l.filename.test(data.filename))
		)

		if (langDesc) {
			initialLang = langDesc.name
		}
	}
	let selectedLanguageName = $state(initialLang)

	function getAppliedTheme(): 'dark' | 'light' {
		const preference = window.localStorage.getItem('theme') || 'system'
		if (preference === 'dark') return 'dark'
		if (preference === 'light') return 'light'
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
	}

	function readTheme(): { isDark: boolean; applied: string } {
		const applied = getAppliedTheme()
		return { isDark: applied === 'dark', applied }
	}

	const themeConfig = new Compartment()
	const languageConfig = new Compartment()

	function updateTheme() {
		if (!view) return

		const { isDark } = readTheme()
		const themeExtension = configuredTheme(isDark ? 'dark' : 'light')
		view.dispatch({ effects: themeConfig.reconfigure(themeExtension) })
	}

	$effect(() => {
		if (!view) return

		if (selectedLanguageName === 'Plain Text') {
			view.dispatch({
				effects: languageConfig.reconfigure([])
			})
			return
		}

		const langDesc = languages.find((l) => l.name === selectedLanguageName)
		if (langDesc) {
			langDesc
				.load()
				.then((support) => {
					if (view && selectedLanguageName === langDesc.name) {
						view.dispatch({
							effects: languageConfig.reconfigure(support)
						})
					}
				})
				.catch((err) => {
					console.error(`Failed to load syntax highlighting for ${selectedLanguageName}:`, err)
				})
		}
	})

	onMount(() => {
		if (data.isBinary || !editorContainer) return

		const { isDark } = readTheme()
		const initialTheme = configuredTheme(isDark ? 'dark' : 'light')

		const extensions = [
			editorKeybindings(),
			highlightSpecialChars(),
			history(),
			drawSelection(),
			dropCursor(),
			EditorState.allowMultipleSelections.of(true),
			bracketMatching(),
			highlightActiveLine(),
			keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
			EditorView.lineWrapping,
			themeConfig.of(initialTheme),
			languageConfig.of([]),
			EditorView.theme({
				'&': {
					height: '100%',
					fontSize: 'var(--font-size-xs)'
				},
				'.cm-content': {
					padding: 'var(--space-4)'
				}
			}),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					editorContent = update.state.doc.toString()
				}
			})
		]

		const startState = EditorState.create({
			doc: editorContent,
			extensions
		})

		view = new EditorView({
			state: startState,
			parent: editorContainer
		})

		const themeObserver = new MutationObserver(() => updateTheme())

		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		})

		const handleUnload = (e: BeforeUnloadEvent) => {
			if (isDirty) {
				e.preventDefault()
			}
		}

		window.addEventListener('beforeunload', handleUnload)

		return () => {
			themeObserver.disconnect()
			view?.destroy()
			window.removeEventListener('beforeunload', handleUnload)
		}
	})

	function formatBytes(bytes: number, decimals = 2) {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const dm = decimals < 0 ? 0 : decimals
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
	}
</script>

<svelte:head>
	<title>{data.filename} — Asset Editor</title>
</svelte:head>

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

<Dialog.Root bind:open={showDeleteDialog}>
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
						<Dialog.Description class="dialogDescription">
							Are you sure you want to delete this asset?
							<br />
							<br />
							Make sure to delete any links to this asset in your pieces.
						</Dialog.Description>
						<div class="dialog-actions">
							<Button variant="outline" onclick={() => (showDeleteDialog = false)}>cancel</Button>

							<form
								method="POST"
								action="?/delete&returnTo={encodeURIComponent(data.returnTo)}"
								use:enhance={enhanceDelete}
							>
								<Button type="submit" variant="error" disabled={isDeleting}>
									{isDeleting ? 'deleting...' : 'delete'}
								</Button>
							</form>
						</div>
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<div class="asset-editor-page">
	<div class="header">
		<div class="actions">
			<a href={data.returnTo}>
				<Button variant="outline">Back</Button>
			</a>
			{#if data.exists}
				<Button variant="error" onclick={() => (showDeleteDialog = true)}>Delete</Button>
			{/if}
			{#if data.exists && !data.isBinary}
				<form method="POST" action="?/save" use:enhance={enhanceSave}>
					<input type="hidden" name="content" value={editorContent} />
					<Button type="submit" disabled={isSaving}>
						{isSaving ? 'Saving...' : 'Save'}
					</Button>
				</form>
			{/if}
		</div>
	</div>

	{#if saveSuccess}
		<div class="banner success-banner">Asset saved successfully!</div>
	{/if}

	{#if saveErrorReason || saveError}
		<div class="banner error-banner">
			<strong>Error:</strong>
			{#if saveErrorReason === 'navigation'}
				Unable to leave this page. Your edits are still here.
			{:else if saveErrorReason === 'delete-refresh'}
				Unable to finish deleting this asset. Please reload to confirm its status.
			{:else if saveErrorReason === 'sign-in'}
				Please sign in again in another tab, then retry. Your edits are still here.
			{:else if saveErrorReason === 'save'}
				Unable to save. Your edits are still here. Please try again.
			{:else if saveErrorReason === 'refresh'}
				Unable to refresh after saving. Your edits are still here. Please try again.
			{:else if saveErrorReason === 'delete' && !saveError}
				Failed to delete
			{:else}
				{saveError}
			{/if}
		</div>
	{/if}

	<div class="meta-section">
		<div class="meta-item">
			<span class="meta-label">Path</span>
			<span class="meta-value code-value">
				{#if data.exists}
					<a href="/admin/asset/viewer/{data.path}" target="_blank" class="path-link">
						{data.path}
					</a>
				{:else}
					{data.path}
				{/if}
			</span>
		</div>
		{#if data.exists && !data.isBinary}
			<div class="meta-item">
				<span class="meta-label">Language</span>
				<span class="meta-value">
					<select bind:value={selectedLanguageName} class="lang-select">
						<option value="Plain Text">Plain Text</option>
						{#each sortedLanguages as lang (lang.name)}
							<option value={lang.name}>{lang.name}</option>
						{/each}
					</select>
				</span>
			</div>
		{/if}
		{#if data.exists}
			<div class="meta-item">
				<span class="meta-label">Size</span>
				<span class="meta-value">{formatBytes(data.size)}</span>
			</div>

			<div class="meta-item">
				<span class="meta-label">Last Modified</span>
				<span class="meta-value">{new Date(data.lastModified).toLocaleString()}</span>
			</div>
		{/if}
	</div>

	<div class="content-area" class:editor-mode={data.exists && !data.isBinary && !data.isImage}>
		{#if !data.exists}
			<div class="preview-container no-asset-box">
				<p class="no-asset-text">there are no assets at this path</p>
			</div>
		{:else if data.isImage}
			<div class="preview-container image-preview-box">
				<div class="image-wrapper">
					<img src="/admin/asset/viewer/{data.path}" alt={data.filename} />
				</div>
			</div>
		{:else if !data.isBinary}
			<div class="editor-outer-wrapper">
				<div bind:this={editorContainer} class="editor-element"></div>
			</div>
		{:else}
			<div class="preview-container binary-info-box">
				<div class="binary-icon-wrapper">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						class="binary-icon"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
						></path>
					</svg>
				</div>
				<p class="binary-text">This file cannot be edited inline.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.asset-editor-page {
		margin: var(--space-4);
		margin-bottom: var(--space-8);
		margin-left: auto;
		margin-right: auto;
		width: 85%;
		max-width: 1000px;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.header {
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}

	.actions {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.banner {
		padding: var(--space-3);
		border-radius: var(--radius-small);
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

	.meta-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		background-color: var(--color-surface-container, #f9f9f9);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-medium);
		padding: var(--space-4);
	}

	.meta-item {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		gap: var(--space-4);
		border-bottom: 1px solid var(--color-outline-variant, #eaeaea);
		padding-bottom: var(--space-2);
	}

	.meta-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.meta-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-on-surface-variant);
		width: 140px;
		flex-shrink: 0;
	}

	.meta-value {
		font-size: 0.875rem;
		color: var(--color-on-surface);
		word-break: break-all;
	}

	.code-value {
		font-family: var(--font-mono, monospace);
		font-size: 0.8rem;
	}

	.path-link {
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 500;
	}

	.path-link:hover {
		text-decoration: underline;
	}

	.lang-select {
		background-color: var(--color-surface-container);
		color: var(--color-on-surface);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-small);
		padding: var(--space-1) var(--space-2);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		outline: none;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}

	.lang-select:focus {
		border-color: var(--color-primary, #0066cc);
	}

	.content-area {
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-medium);
		overflow: hidden;
		background-color: var(--color-surface);
		min-height: 400px;
		display: flex;
		flex-direction: column;
	}

	.content-area.editor-mode {
		border: none;
		background-color: transparent;
	}

	.preview-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-8);
	}

	.image-preview-box {
		background-color: var(--color-surface-container-low, #fcfcfc);
	}

	.image-wrapper {
		width: 100%;
		max-width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.image-wrapper img {
		width: 100%;
		max-width: 100%;
		height: auto;
		max-height: 75vh;
		display: block;
		object-fit: contain;
	}

	.binary-info-box {
		background-color: var(--color-surface-container-lowest, #fff);
		gap: var(--space-4);
	}

	.binary-icon-wrapper {
		color: var(--color-on-surface-variant);
	}

	.binary-icon {
		width: 48px;
		height: 48px;
	}

	.binary-text {
		color: var(--color-on-surface-variant);
		font-size: 0.95rem;
		margin: 0;
	}

	.editor-outer-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 500px;
	}

	.editor-element {
		background-color: var(--editor-background, var(--color-surface));
		flex: 1;
		position: relative;
		overflow: hidden;
		border-radius: var(--radius-medium);
		isolation: isolate;
	}

	.editor-element::after {
		content: '';
		position: absolute;
		inset: 0;
		box-shadow: inset 0 2px 4px var(--color-shadow);
		pointer-events: none;
		z-index: 12;
		border-radius: inherit;
	}

	:global(.cm-editor) {
		height: 100%;
	}

	:global(.cm-scroller) {
		font-family: var(--font-mono-name), monospace !important;
	}

	@media (max-width: 767px) {
		.meta-item {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
		}

		.meta-label {
			width: auto;
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

	.dialogDescription {
		font-size: 0.875rem;
		color: var(--color-on-surface-variant, #666);
		margin: 0;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.no-asset-box {
		background-color: var(--color-surface-container-lowest, #fff);
	}

	.no-asset-text {
		color: var(--color-on-surface-variant);
		font-size: 0.95rem;
		margin: 0;
	}
</style>
