import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import Page from './+page.svelte'

vi.mock('$app/navigation', () => ({ goto: vi.fn() }))
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/admin/pieces/create') } }))

const data = {
	types: ['books', 'films'],
	type: 'books',
	directory: '.',
	directories: ['.', 'books', 'films']
}

function html(form: unknown = null, defaults = data) {
	return render(Page, { props: { data: defaults, form } as ComponentProps<typeof Page> }).body
}

test('creation offers only the ordinary folder, type and title form', () => {
	const output = html()
	expect(output).toContain('action="?/create"')
	expect(output).toContain('name="directory"')
	expect(output).toContain('name="type"')
	expect(output).toContain('name="name"')
	expect(output).toContain('title</label>')
	expect(output).toContain('Create')
	expect(output).toContain('Cancel')
	expect(output).not.toContain('checkbox')
	expect(output).not.toContain('name="content"')
	expect(output).not.toContain('name="files"')
	expect(output).not.toContain('Generate')
})

test.each(['', '.', 'books', 'films'])(
	'initial values follow the loaded folder %j and type',
	(directory) => {
		const output = html(null, { ...data, type: 'films', directory })
		expect(output).toContain('value="films" name="type"')
		expect(output).toContain(`value="${directory || '.'}" name="directory"`)
	}
)

test('a failed create retains the title and chosen destination with its error', () => {
	const output = html({
		name: 'another-title',
		type: 'films',
		directory: 'books',
		error: { message: 'file already exists' }
	})
	expect(output).toContain('action="?/create"')
	expect(output).toContain('value="another-title"')
	expect(output).toContain('value="films" name="type"')
	expect(output).toContain('value="books" name="directory"')
	expect(output).toContain('file already exists')
	expect(output).toContain('role="alert"')
})
