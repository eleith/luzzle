<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { EditorView, basicSetup } from 'codemirror'
	import { EditorState, Compartment } from '@codemirror/state'
	import { markdown } from '@codemirror/lang-markdown'
	import { yamlFrontmatter } from '@codemirror/lang-yaml'
	import { keymap } from '@codemirror/view'
	import { indentWithTab } from '@codemirror/commands'
	import type { EditorThemeColors } from '$lib/server/shiki'
	import { createEditorTheme } from './theme'

	type Props = {
		value: string
		onchange?: (value: string) => void
		editorThemes: { light: EditorThemeColors; dark: EditorThemeColors }
	}

	let { value = $bindable(), onchange, editorThemes }: Props = $props()

	let editorContainer: HTMLDivElement
	let view: EditorView
	const themeConfig = new Compartment()

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
		const startState = EditorState.create({
			doc: value,
			extensions: [
				basicSetup,
				EditorView.lineWrapping,
				yamlFrontmatter({
					content: markdown()
				}),
				keymap.of([indentWithTab]),
				themeConfig.of([]), // Start empty
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						value = update.state.doc.toString()
						onchange?.(value)
					}
				}),
				EditorView.theme({
					'&': {
						height: '100%',
						fontSize: 'var(--font-size-xs)'
					},
					'.cm-content': {
						padding: 'var(--space-4)'
					},
					'.cm-gutters': { display: 'none' }
				})
			]
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
