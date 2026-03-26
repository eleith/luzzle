<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { EditorView } from 'codemirror'
	import { EditorState, Compartment } from '@codemirror/state'
	import type { EditorThemeColors } from '$lib/server/shiki'
	import { createEditorTheme } from './theme'
	import { createEditorExtensions } from './config'
	import { createLSPExtension, destroyLSPClient } from './lsp'

	type Props = {
		value: string
		onchange?: (value: string) => void
		editorThemes: { light: EditorThemeColors; dark: EditorThemeColors }
		type?: string
		file?: string
	}

	let { value = $bindable(), onchange, editorThemes, type, file }: Props = $props()

	let editorContainer: HTMLDivElement
	let view: EditorView
	const themeConfig = new Compartment()
	const linterConfig = new Compartment()

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

	onMount(async () => {
		const extensions = createEditorExtensions({
			type,
			linterConfig,
			themeConfig,
			onUpdate: (update) => {
				if (update.docChanged) {
					value = update.state.doc.toString()
					onchange?.(value)
				}
			}
		})

		if (file) {
			try {
				const lspExtension = await createLSPExtension(`file:///${file}`)
				extensions.push(lspExtension)
			} catch (e) {
				console.error('[lsp] failed to create extension:', e)
			}
		}

		const startState = EditorState.create({
			doc: value,
			extensions
		})

		view = new EditorView({
			state: startState,
			parent: editorContainer
		})

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
