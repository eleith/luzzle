<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { EditorView } from 'codemirror'
	import { EditorState, Compartment } from '@codemirror/state'
	import type { EditorThemeColors } from '$lib/server/shiki'
	import { createEditorTheme } from './theme'
	import { createEditorExtensions } from './config'
	import { createLSPExtension, destroyLSPClient } from './lsp'
	import { luzzleFieldEditor } from './extensions/luzzleFieldEditor'

	type Props = {
		value: string
		onchange?: (value: string) => void
		editorThemes: { light: EditorThemeColors; dark: EditorThemeColors }
		file?: string
		returnTo?: string
	}

	let { value = $bindable(), onchange, editorThemes, file, returnTo }: Props = $props()

	let editorContainer: HTMLDivElement
	let view: EditorView
	const themeConfig = new Compartment()
	const lspConfig = new Compartment()
	const fieldEditorConfig = new Compartment()

	function updateTheme() {
		const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
		const themeColors = isDark ? editorThemes.dark : editorThemes.light
		const themeExtension = createEditorTheme(themeColors, isDark)

		if (editorContainer) {
			editorContainer.style.backgroundColor = themeColors.bg
		}

		view.dispatch({
			effects: themeConfig.reconfigure(themeExtension)
		})
	}

	onMount(() => {
		const extensions = createEditorExtensions({
			themeConfig,
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
