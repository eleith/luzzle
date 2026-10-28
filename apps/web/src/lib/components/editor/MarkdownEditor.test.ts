import { createRawSnippet } from 'svelte'
import { render } from 'svelte/server'
import { expect, test, vi } from 'vitest'
import MarkdownEditor from './MarkdownEditor.svelte'

vi.mock('./lsp', () => ({ createLSPExtension: vi.fn(), destroyLSPClient: vi.fn() }))
vi.mock('./keybindings', () => ({ editorKeybindings: vi.fn(), finishVimInput: vi.fn() }))

test('editor actions render inside the same frame, before the CodeMirror mount', () => {
	const toolbar = createRawSnippet(() => ({ render: () => '<div>Editor actions fixture</div>' }))
	const { body } = render(MarkdownEditor, { props: { value: 'Saved source', toolbar } })

	expect(body.match(/class="editor-wrapper\b/g)).toHaveLength(1)
	expect(body).toMatch(
		/class="editor-wrapper\b[^>]*>[\s\S]*class="editor-toolbar\b[^>]*>[\s\S]*Editor actions fixture[\s\S]*class="editor-body\b/
	)
})

test('the editor can still render without a toolbar', () => {
	const { body } = render(MarkdownEditor, { props: { value: 'Saved source' } })

	expect(body).toMatch(/class="editor-body\b/)
	expect(body).not.toMatch(/class="editor-toolbar\b/)
})

// SSR verifies composition only; actual editor input, focus and visual framing need a browser.
