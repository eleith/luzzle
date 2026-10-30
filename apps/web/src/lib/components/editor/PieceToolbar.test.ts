import { createRawSnippet, type ComponentProps } from 'svelte'
import { render } from 'svelte/server'
import { expect, test } from 'vitest'
import PieceToolbar from './PieceToolbar.svelte'

const file = 'books/源 #?%.books.md'
const previewHref = '/admin/piece/books/%E6%BA%90%20%23%3F%25.books.md/preview'
const publishedHref = '/admin/piece/books/%E6%BA%90%20%23%3F%25.books.md/published'
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

function buttons(output: string) {
	return [...output.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map((match) => ({
		attributes: match[1],
		label: match[2].replace(/<!--[\s\S]*?-->/g, '').trim()
	}))
}

function buttonAttributes(output: string, label: string): string {
	const button = buttons(output).find((button) => button.label === label)
	if (!button) throw new Error(`Missing button: ${label}`)
	return button.attributes
}

test.each([false, true])(
	'saved files show Save and More, with Saved linking to preview when published=%s',
	(hasPublishedVersion) => {
		const output = html({ hasPublishedVersion })
		expect(buttons(output).map((button) => button.label)).toEqual(['Save'])
		expect(buttonAttributes(output, 'Save')).toMatch(disabledAttribute)
		expect(output).toContain(`href="${previewHref}"`)
		expect(output).toContain('aria-label="Preview saved piece"')
		expect(output).toContain('More fixture')
		expect(output).toContain('aria-live="polite"')
	}
)

test('unsaved documents have a short status instead of a Saved preview link', () => {
	const output = html({ isDirty: true })
	expect(buttonAttributes(output, 'Save')).not.toMatch(disabledAttribute)
	expect(output).toContain('Unsaved')
	expect(output).not.toContain('Unsaved changes')
	expect(output).not.toContain(previewHref)
	expect(output).toContain(publishedHref)
})

test.each([false, true])('saving disables Save when dirty=%s', (isDirty) => {
	const output = html({ isDirty, isSaving: true })
	expect(buttonAttributes(output, 'Saving…')).toMatch(disabledAttribute)
	expect(output).not.toContain(previewHref)
	expect(output).not.toContain('Unsaved')
})

test.each([
	{ isDirty: false, isSaving: false, saveLabel: 'Save' },
	{ isDirty: true, isSaving: false, saveLabel: 'Save' },
	{ isDirty: false, isSaving: true, saveLabel: 'Saving…' },
	{ isDirty: true, isSaving: true, saveLabel: 'Saving…' }
])('editor commands retain their shared appearance with %o', ({ saveLabel, ...state }) => {
	const output = html(state)
	expect(buttonAttributes(output, saveLabel)).toContain('data-variant="editor"')
})

test('Save retains its source form submission', () => {
	const output = html({ isDirty: true })
	const save = buttonAttributes(output, 'Save')
	expect(save).toContain('type="submit"')
	expect(save).toContain('form="save-piece"')
})

test('publication status links only to an existing public version', () => {
	expect(html()).toContain(`href="${publishedHref}"`)
	const unpublished = html({ hasPublishedVersion: false })
	expect(unpublished).toContain('Unpublished')
	expect(unpublished).not.toContain(publishedHref)
	expect(unpublished).toContain(previewHref)
})

test.each([false, true])(
	'pending Unpublish replaces only the public link when published=%s',
	(hasPublishedVersion) => {
		const output = html({ hasPublishedVersion, isUnpublishing: true })
		expect(output).toContain('Unpublishing…')
		expect(output).not.toContain(publishedHref)
		expect(output).toContain(previewHref)
	}
)

test('editor actions do not duplicate archive navigation', () => {
	const output = html()
	expect(output).toContain('aria-label="Editor actions"')
	expect(output).not.toContain('href="/admin"')
	expect(output).not.toContain('Back to archive')
})

// SSR verifies labels, links and disabled/form semantics, not clicks or responsive layout.
