import { expect, test } from 'vitest'
import { render } from 'svelte/server'
import GenerationFields from './GenerationFields.svelte'

const fields = ['title', 'cover', 'authors']

test('renders a labeled combobox with one selection shortcut, not a checkbox list', () => {
	const { body } = render(GenerationFields, { props: { fields, selected: [] } })
	expect(body).toContain('role="combobox"')
	expect(body).toContain('Search and choose fields')
	expect(body).toContain('Select all')
	expect(body).not.toContain('Choose one or more fields')
	expect(body).not.toContain('type="checkbox"')
	const inputId = body.match(/<input[^>]*id="([^"]+)"/)?.[1]
	expect(inputId).toBeTruthy()
	expect(body).toContain(`for="${inputId}"`)
	expect(body).not.toContain('aria-describedby=')
})

test('does not add a selected-name row or per-field remove buttons', () => {
	const { body } = render(GenerationFields, {
		props: { fields, selected: ['title', 'cover'] }
	})
	expect(body).not.toContain('title, cover')
	expect(body).not.toContain('class="selection"')
	expect(body).not.toContain('aria-live="polite"')
	expect(body).not.toContain('Remove title')
	expect(body).not.toContain('Remove cover')
})

test('offers clearing when all fields are selected', () => {
	const { body } = render(GenerationFields, {
		props: { fields, selected: fields }
	})
	expect(body).toContain('Clear selection')
})

test('disables field controls during generation', () => {
	const { body } = render(GenerationFields, {
		props: { fields, selected: ['title'], disabled: true }
	})
	expect(body).toMatch(/<input[^>]*disabled/)
	expect(body).toMatch(/<button[^>]*class="selection-action[^>]*disabled/)
})

test('disables Select all when the schema has no fields', () => {
	const { body } = render(GenerationFields, { props: { fields: [], selected: [] } })
	expect(body).toMatch(/<button[^>]*class="selection-action[^>]*disabled/)
})
