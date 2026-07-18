<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { EditorView } from 'codemirror'
	import { EditorState, Compartment } from '@codemirror/state'
	import { gruvboxDark, gruvboxDarkBg } from './themes/gruvbox-dark'
	import { gruvboxLight, gruvboxLightBg } from './themes/gruvbox-light'
	import { createEditorExtensions } from './config'
	import { createLSPExtension, destroyLSPClient } from './lsp'
	import { luzzleFieldEditor } from './extensions/luzzleFieldEditor'
	import { luzzleAssetEditor } from './extensions/luzzleAssetEditor'

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

	type Props = {
		value: string
		onchange?: (value: string) => void
		file?: string
		returnTo?: string
		assetFields?: string[]
	}

	let { value = $bindable(), onchange, file, returnTo, assetFields = [] }: Props = $props()

	let editorContainer: HTMLDivElement
	let view: EditorView
	const themeConfig = new Compartment()
	const lspConfig = new Compartment()
	const fieldEditorConfig = new Compartment()
	const assetEditorConfig = new Compartment()

	function updateTheme() {
		const { isDark } = readTheme()
		const themeExtension = isDark ? gruvboxDark : gruvboxLight

		if (editorContainer) {
			editorContainer.style.backgroundColor = isDark ? gruvboxDarkBg : gruvboxLightBg
		}

		view.dispatch({
			effects: themeConfig.reconfigure(themeExtension)
		})
	}

	onMount(() => {
		const { isDark } = readTheme()
		const initialTheme = isDark ? gruvboxDark : gruvboxLight

		const extensions = createEditorExtensions({
			themeConfig,
			initialTheme,
			onUpdate: (update) => {
				if (update.docChanged) {
					value = update.state.doc.toString()
					onchange?.(value)
				}
			},
			returnTo
		})

		extensions.push(lspConfig.of([]))

		if (file && returnTo) {
			extensions.push(fieldEditorConfig.of(luzzleFieldEditor({ file, returnTo })))
		} else {
			extensions.push(fieldEditorConfig.of([]))
		}

		if (assetFields.length > 0) {
			extensions.push(assetEditorConfig.of(luzzleAssetEditor(assetFields)))
		} else {
			extensions.push(assetEditorConfig.of([]))
		}

		const startState = EditorState.create({
			doc: value,
			extensions
		})

		view = new EditorView({
			state: startState,
			parent: editorContainer
		})

		if (file) {
			createLSPExtension(`luzzle-web:///archive/${file}`)
				.then((ext) => {
					view.dispatch({ effects: lspConfig.reconfigure(ext) })
				})
				.catch((e) => {
					console.error('[lsp] failed to create extension:', e)
				})
		}

		updateTheme()

		const observer = new MutationObserver((_mutations) => {
			updateTheme()
		})

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		})

		return () => {
			observer.disconnect()
		}
	})

	$effect(() => {
		if (view && value !== view.state.doc.toString()) {
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: value
				}
			})
		}
	})

	onDestroy(() => {
		if (view) {
			view.destroy()
		}
		destroyLSPClient()
	})

	export function insertText(text: string) {
		if (view) {
			const transaction = view.state.update({
				changes: {
					from: view.state.selection.main.from,
					to: view.state.selection.main.to,
					insert: text
				},
				selection: { anchor: view.state.selection.main.from + text.length }
			})
			view.dispatch(transaction)
			view.focus()
		}
	}

	export function getSelectedText(): string {
		if (view) {
			const { from, to } = view.state.selection.main
			return view.state.doc.sliceString(from, to)
		}
		return ''
	}
</script>

<div class="editor-wrapper" bind:this={editorContainer}></div>

<style>
	.editor-wrapper {
		width: 100%;
		border-radius: var(--radius-medium);
		overflow: hidden;
		min-height: 500px;
		position: relative;
		transition: background-color 0.2s ease;
	}

	.editor-wrapper::after {
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
</style>
