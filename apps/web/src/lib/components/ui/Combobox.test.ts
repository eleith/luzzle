import { render } from 'svelte/server'
import { expect, test } from 'vitest'
import Combobox from './Combobox.svelte'

const items = [
	{ value: '.', label: '(root)' },
	{ value: 'books', label: 'Books' },
	{ value: 'films', label: 'Films' }
]

test.each([
	['.', '(root)'],
	['books', 'Books'],
	['films', 'Films'],
	['missing', ''],
	['', '']
])('initial input label matches selection %j', (value, label) => {
	const { body } = render(Combobox, { props: { items, value, name: 'directory' } })
	const input = body.match(/<input\b[^>]*role="combobox"[^>]*>/)?.[0]
	expect(input).toBeDefined()
	expect(input).toContain(`value="${label}"`)
	expect(body).toContain(`value="${value}" name="directory"`)
})

// SSR covers initial labels and submitted values, not typing or live prop updates.
