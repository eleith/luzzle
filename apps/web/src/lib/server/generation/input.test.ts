import { afterEach, describe, expect, it, vi } from 'vitest'
import { readCreateInput, readEditInput } from './input'
import { MAX_SOURCE_CHARS, MAX_INSTRUCTION_CHARS } from '../constants'

vi.mock('@luzzle/core', () => ({
	DEFAULT_GENERATION_LIMITS: { maxFiles: 2, maxFileBytes: 8, maxTotalFileBytes: 12 }
}))
vi.mock('../constants', () => ({ MAX_SOURCE_CHARS: 128, MAX_INSTRUCTION_CHARS: 32 }))

function createForm(): FormData {
	const form = new FormData()
	form.set('name', 'Dune')
	form.set('type', 'book')
	return form
}

function editForm(): FormData {
	const form = new FormData()
	form.set('file', 'library/dune.book.md')
	form.set('source', JSON.stringify(''))
	form.set('target', 'body')
	return form
}

function attach(form: FormData, size: number, name = 'reference.bin') {
	form.append('files', new File([new Uint8Array(size).fill(255)], name))
}

afterEach(() => vi.restoreAllMocks())

describe('readCreateInput', () => {
	it('accepts create input with optional fields omitted', async () => {
		await expect(readCreateInput(createForm())).resolves.toEqual({
			name: 'Dune',
			type: 'book',
			directory: '',
			instructions: '',
			files: []
		})
	})

	it('preserves create text, returns binary Buffers and ignores unrelated fields', async () => {
		const form = createForm()
		form.set('directory', 'library/science fiction')
		form.set('instructions', '  Keep the original tone.  ')
		form.set('unrelated', 'ignored')
		attach(form, 8)
		attach(form, 4)
		const result = await readCreateInput(form)
		expect(result).toEqual({
			name: 'Dune',
			type: 'book',
			directory: 'library/science fiction',
			instructions: '  Keep the original tone.  ',
			files: [Buffer.alloc(8, 255), Buffer.alloc(4, 255)]
		})
		expect(result.files.every(Buffer.isBuffer)).toBe(true)
	})

	it.each(['name', 'type'])('requires nonblank text for %s', async (field) => {
		const form = createForm()
		form.delete(field)
		await expect(readCreateInput(form)).rejects.toMatchObject({ status: 400 })
		for (const value of [' \t ', new File(['value'], 'value.txt')]) {
			form.set(field, value)
			await expect(readCreateInput(form)).rejects.toMatchObject({ status: 400 })
		}
	})

	it('requires optional directory to be text', async () => {
		const form = createForm()
		form.set('directory', new File(['value'], 'value.txt'))
		await expect(readCreateInput(form)).rejects.toMatchObject({ status: 400 })
	})

	it.each([
		['attachment type', [1], 400],
		['per-file bytes', [1, 9], 413],
		['combined bytes', [8, 5], 413],
		['file count', [1, 1, 1], 413]
	] as const)('checks %s before reading any attachment buffers', async (reason, sizes, status) => {
		const form = createForm()
		for (const size of sizes) attach(form, size)
		const reads = form.getAll('files').map((file) => vi.spyOn(file as File, 'arrayBuffer'))
		if (reason === 'attachment type') form.append('files', 'not a file')
		await expect(readCreateInput(form)).rejects.toMatchObject({ status })
		for (const bufferRead of reads) expect(bufferRead).not.toHaveBeenCalled()
	})

	it('ignores empty files without counting them toward attachment limits', async () => {
		const form = createForm()
		for (let i = 0; i < 3; i++) attach(form, 0, 'empty.txt')
		attach(form, 0, '')
		attach(form, 8)
		attach(form, 4)
		await expect(readCreateInput(form)).resolves.toMatchObject({
			files: [Buffer.alloc(8, 255), Buffer.alloc(4, 255)]
		})
	})
})

describe('readEditInput', () => {
	it.each(['', '---\ntitle: Dune\n---\n\n  body\n', '  body\r\nsecond line\r\n'])(
		'preserves JSON-encoded editor source exactly: %j',
		async (source) => {
			const form = editForm()
			form.set('source', JSON.stringify(source))
			await expect(readEditInput(form)).resolves.toEqual({
				file: 'library/dune.book.md',
				source,
				target: { kind: 'body' },
				instructions: '',
				files: []
			})
		}
	)

	it.each(['title', 'body'])('keeps field target %s distinct from the body target', async (key) => {
		const form = editForm()
		form.set('target', 'field')
		form.set('key', key)
		form.set('unrelated', 'ignored')
		await expect(readEditInput(form)).resolves.toMatchObject({ target: { kind: 'field', key } })
	})

	it.each(['file', 'source', 'target'])('requires text for %s', async (field) => {
		const form = editForm()
		form.delete(field)
		await expect(readEditInput(form)).rejects.toMatchObject({ status: 400 })
		form.set(field, new File(['value'], 'value.txt'))
		await expect(readEditInput(form)).rejects.toMatchObject({ status: 400 })
	})

	it('rejects a blank file', async () => {
		const form = editForm()
		form.set('file', ' \t ')
		await expect(readEditInput(form)).rejects.toMatchObject({ status: 400 })
	})

	it('rejects unsupported targets and requires a text key for field edits', async () => {
		const form = editForm()
		form.set('target', 'unknown')
		await expect(readEditInput(form)).rejects.toMatchObject({ status: 400 })
		form.set('target', 'field')
		await expect(readEditInput(form)).rejects.toMatchObject({ status: 400 })
		for (const key of ['', new File(['title'], 'key.txt')]) {
			form.set('key', key)
			await expect(readEditInput(form)).rejects.toMatchObject({ status: 400 })
		}
	})

	it.each(['not json', 'null', '{}', '123'])(
		'rejects nonstring source JSON: %s',
		async (source) => {
			const form = editForm()
			form.set('source', source)
			await expect(readEditInput(form)).rejects.toMatchObject({ status: 400 })
		}
	)

	it('bounds decoded source characters, not UTF-8 bytes', async () => {
		const form = editForm()
		const source = 'é'.repeat(MAX_SOURCE_CHARS)
		form.set('source', JSON.stringify(source))
		await expect(readEditInput(form)).resolves.toMatchObject({ source })
		form.set('source', JSON.stringify(source + 'é'))
		await expect(readEditInput(form)).rejects.toMatchObject({ status: 413 })
	})
})

describe('instructions in both readers', () => {
	it('requires optional instructions to be text', async () => {
		const create = createForm()
		const edit = editForm()
		create.set('instructions', new File(['value'], 'value.txt'))
		edit.set('instructions', new File(['value'], 'value.txt'))
		await expect(readCreateInput(create)).rejects.toMatchObject({ status: 400 })
		await expect(readEditInput(edit)).rejects.toMatchObject({ status: 400 })
	})

	it('preserves whitespace and bounds characters, not UTF-8 bytes', async () => {
		const create = createForm()
		const edit = editForm()
		const instructions = ' ' + 'é'.repeat(MAX_INSTRUCTION_CHARS - 2) + ' '
		create.set('instructions', instructions)
		edit.set('instructions', instructions)
		await expect(readCreateInput(create)).resolves.toMatchObject({ instructions })
		await expect(readEditInput(edit)).resolves.toMatchObject({ instructions })
		create.set('instructions', instructions + 'é')
		edit.set('instructions', instructions + 'é')
		await expect(readCreateInput(create)).rejects.toMatchObject({ status: 413 })
		await expect(readEditInput(edit)).rejects.toMatchObject({ status: 413 })
	})
})
