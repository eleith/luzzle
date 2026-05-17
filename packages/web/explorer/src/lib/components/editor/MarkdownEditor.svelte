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
		const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
		const themeExtension = isDark ? gruvboxDark : gruvboxLight

		if (editorContainer) {
			editorContainer.style.backgroundColor = isDark ? gruvboxDarkBg : gruvboxLightBg
		}

		view.dispatch({
			effects: themeConfig.reconfigure(themeExtension)
		})
	}

	onMount(() => {
		const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
		const initialTheme = isDark ? gruvboxDark : gruvboxLight

		const extensions = createEditorExtensions({
			themeConfig,
			initialTheme,
			onUpdate: (update) => {
				if (update.docChanged) {
					value = update.state.doc.toString()
					onchange?.(value)
				}
			}
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
			createLSPExtension(`file:///app/archive/${file}`)
				.then((ext) => {
					view.dispatch({ effects: lspConfig.reconfigure(ext) })
				})
				.catch((e) => {
					console.error('[lsp] failed to create extension:', e)
				})
		}

		updateTheme()

		const observer = new MutationObserver(() => {
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

	onDestroy(() => {
		if (view) {
			view.destroy()
		}
		destroyLSPClient()
	})
</script>

<div class="editor-wrapper" bind:this={editorContainer}></div>

<style>
	.editor-wrapper {
		width: 100%;
		border-radius: var(--radius-medium);
		overflow: hidden;
		min-height: 500px;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
		transition: background-color 0.2s ease;
	}

	:global(.cm-editor) {
		height: 100%;
		background-color: transparent !important;
	}

	:global(.cm-scroller) {
		font-family: var(--font-mono-name), monospace !important;
	}
</style>
