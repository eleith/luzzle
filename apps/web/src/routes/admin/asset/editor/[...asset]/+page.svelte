<script lang="ts">
	import { onMount } from 'svelte'
	import { enhance } from '$app/forms'
	import { Dialog } from 'bits-ui'
	import { fade, fly } from 'svelte/transition'
	import { beforeNavigate, goto } from '$app/navigation'
	import Button from '$lib/components/ui/Button.svelte'
	import type { PageProps } from './$types'
	import { EditorView } from 'codemirror'
	import { EditorState, Compartment } from '@codemirror/state'
	import {
		gruvboxDark,
		gruvboxDarkBg
	} from '../../../../../lib/components/editor/themes/gruvbox-dark'
	import {
		gruvboxLight,
		gruvboxLightBg
	} from '../../../../../lib/components/editor/themes/gruvbox-light'
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
	let saveSuccess = $state(false)

	const isDirty = $derived(editorContent !== data.content && !isSaving)

	let targetUrl = $state<string | null>(null)
	let showWarningDialog = $state(false)
	let bypassWarning = $state(false)

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
		const themeExtension = isDark ? gruvboxDark : gruvboxLight

		if (editorContainer) {
			editorContainer.style.backgroundColor = isDark ? gruvboxDarkBg : gruvboxLightBg
		}

		view.dispatch({
			effects: themeConfig.reconfigure(themeExtension)
		})
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
		const initialTheme = isDark ? gruvboxDark : gruvboxLight

		if (editorContainer) {
			editorContainer.style.backgroundColor = isDark ? gruvboxDarkBg : gruvboxLightBg
		}

		const extensions = [
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
				e.returnValue = ''
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
							You have unsaved changes. If you leave this page, these changes will be permanently lost.
						</Dialog.Description>
						<div class="dialog-actions">
							<Button
								variant="outline"
								onclick={() => (showWarningDialog = false)}
							>
								stay
							</Button>
							<Button
								variant="error"
								onclick={confirmDiscard}
							>
								discard
							</Button>
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
			{#if !data.isBinary}
				<form
					method="POST"
					action="?/save"
					use:enhance={() => {
						isSaving = true
						saveError = null
						saveSuccess = false
						return async ({ result, update }) => {
							isSaving = false
							if (result.type === 'success') {
								saveSuccess = true
								await update({ reset: false })
							} else if (result.type === 'failure') {
								const data = result.data as { error?: { message?: string } } | undefined
								saveError = data?.error?.message || 'Failed to save'
							}
						}
					}}
				>
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

	{#if saveError}
		<div class="banner error-banner">
			<strong>Error:</strong>
			{saveError}
		</div>
	{/if}

	<div class="meta-section">
		<div class="meta-item">
			<span class="meta-label">Path</span>
			<span class="meta-value code-value">
				<a href="/admin/asset/viewer/{data.path}" target="_blank" class="path-link">
					{data.path}
				</a>
			</span>
		</div>
		{#if !data.isBinary}
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
		<div class="meta-item">
			<span class="meta-label">Size</span>
			<span class="meta-value">{formatBytes(data.size)}</span>
		</div>

		<div class="meta-item">
			<span class="meta-label">Last Modified</span>
			<span class="meta-value">{new Date(data.lastModified).toLocaleString()}</span>
		</div>
	</div>

	<div class="content-area" class:editor-mode={!data.isBinary && !data.isImage}>
		{#if data.isImage}
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
						/>
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
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
		pointer-events: none;
		z-index: 12;
		border-radius: inherit;
	}

	:global(.cm-editor) {
		height: 100%;
		background-color: transparent !important;
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

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}
</style>
