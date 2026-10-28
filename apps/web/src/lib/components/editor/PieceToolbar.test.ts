import { createRawSnippet, type ComponentProps } from 'svelte'
import { render } from 'svelte/server'
import { expect, test, vi } from 'vitest'
import PieceToolbar from './PieceToolbar.svelte'

vi.mock('$app/navigation', () => ({ goto: vi.fn() }))

const file = 'books/源 #?%.books.md'
const children = createRawSnippet(() => ({ render: () => '<span>More fixture</span>' }))
const disabledAttribute = /(?:^|\s)disabled(?:\s|=|$)/

function html(props: Partial<ComponentProps<typeof PieceToolbar>> = {}) {
	return render(PieceToolbar, {
		props: {
			file,
			saveFormId: 'save-piece',
			isDirty: false,
			isSaving: false,
			hasPublishedVersion: true,
			children,
			...props
		}
	}).body
}

function buttonAttributes(output: string, label: string): string {
	const buttons = [...output.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
	const button = buttons.find((match) => match[2].replace(/<!--[\s\S]*?-->/g, '').trim() === label)
	if (!button) throw new Error(`Missing button: ${label}`)
	return button[1]
}

test.each([false, true])(
	'saved files keep Preview and Publish visible and available with published version=%s',
	(hasPublishedVersion) => {
		const output = html({ hasPublishedVersion })
		expect(buttonAttributes(output, 'Preview')).not.toMatch(disabledAttribute)
		expect(buttonAttributes(output, 'Publish')).not.toMatch(disabledAttribute)
		expect(buttonAttributes(output, 'Save')).toMatch(disabledAttribute)
		expect(output).toContain('More fixture')
		expect(output).toContain('Saved')
		expect(output).toContain('aria-live="polite"')
	}
)

test('unsaved edits keep primary actions visible with a short status', () => {
	const output = html({ isDirty: true })
	expect(buttonAttributes(output, 'Save')).not.toMatch(disabledAttribute)
	expect(buttonAttributes(output, 'Preview')).toMatch(disabledAttribute)
	expect(buttonAttributes(output, 'Publish')).toMatch(disabledAttribute)
	expect(output).toContain('Unsaved changes')
})

test.each([false, true])('saving disables primary actions even when dirty=%s', (isDirty) => {
	const output = html({ isDirty, isSaving: true })
	for (const label of ['Saving…', 'Preview', 'Publish']) {
		expect(buttonAttributes(output, label)).toMatch(disabledAttribute)
	}
	expect(output).not.toContain('Unsaved changes')
})

test.each([
	{ isDirty: false, isSaving: false },
	{ isDirty: true, isSaving: false },
	{ isDirty: false, isSaving: true },
	{ isDirty: true, isSaving: true }
])('editor commands retain their explicit appearance with %o', (state) => {
	const output = html(state)
	for (const label of [state.isSaving ? 'Saving…' : 'Save', 'Preview', 'Publish']) {
		expect(buttonAttributes(output, label)).toContain('data-variant="editor"')
	}
})

test('Save submits the source form instead of navigating or implicitly publishing', () => {
	const attributes = buttonAttributes(html({ isDirty: true }), 'Save')
	expect(attributes).toContain('type="submit"')
	expect(attributes).toContain('form="save-piece"')
	for (const label of ['Preview', 'Publish']) {
		expect(buttonAttributes(html(), label)).toContain('type="button"')
	}
})

test('publication status is an encoded link only when a public version exists', () => {
	const href = '/admin/piece/books/%E6%BA%90%20%23%3F%25.books.md/published'
	expect(html()).toContain(`href="${href}"`)
	const unpublished = html({ hasPublishedVersion: false })
	expect(unpublished).toContain('Not published')
	expect(unpublished).not.toContain(href)
})

test('editor actions do not duplicate the surrounding archive navigation', () => {
	const output = html()
	expect(output).toContain('aria-label="Editor actions"')
	expect(output).not.toContain('href="/admin"')
	expect(output).not.toContain('Back to archive')
	expect(output).not.toContain('Publish…')
})

// SSR proves rendering and disabled/form semantics, not click handling or navigation guards.
