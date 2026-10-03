import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFieldsInput, readBodyInput } from './input'
import { MAX_SOURCE_CHARS, MAX_INSTRUCTION_CHARS } from '../constants'

vi.mock('@luzzle/core', () => ({
	DEFAULT_GENERATION_LIMITS: { maxFiles: 2, maxFileBytes: 8, maxTotalFileBytes: 12 }
}))
vi.mock('../constants', () => ({ MAX_SOURCE_CHARS: 128, MAX_INSTRUCTION_CHARS: 32 }))

function editorForm(): FormData {
	const form = new FormData()
	form.set('source', JSON.stringify(''))
	form.set('fields', JSON.stringify(['title']))
	return form
}

function attach(form: FormData, size: number, name = 'reference.bin') {
	form.append('files', new File([new Uint8Array(size).fill(255)], name))
}

afterEach(() => vi.restoreAllMocks())

describe.each([
	['fields', readFieldsInput],
	['body', readBodyInput]
] as const)('read %s input', (kind, readInput) => {
	it.each(['', '---\ntitle: Dune\n---\n\n  body\n', '  body\r\nsecond line\r\n'])(
		'preserves JSON-encoded editor source exactly: %j',
		async (source) => {
			const form = editorForm()
			form.set('source', JSON.stringify(source))
			await expect(readInput(form)).resolves.toEqual({
				source,
				...(kind === 'fields' ? { keys: ['title'] } : {}),
				instructions: '',
				files: []
			})
		}
	)

	it('requires source text', async () => {
		const form = editorForm()
		form.delete('source')
		await expect(readInput(form)).rejects.toMatchObject({ status: 400 })
		form.set('source', new File(['value'], 'value.txt'))
		await expect(readInput(form)).rejects.toMatchObject({ status: 400 })
	})

	it.each(['not json', 'null', '{}', '123'])(
		'rejects nonstring source JSON: %s',
		async (source) => {
			const form = editorForm()
			form.set('source', source)
			await expect(readInput(form)).rejects.toMatchObject({ status: 400 })
		}
	)

	it('bounds decoded source characters, not UTF-8 bytes', async () => {
		const form = editorForm()
		const source = 'é'.repeat(MAX_SOURCE_CHARS)
		form.set('source', JSON.stringify(source))
		await expect(readInput(form)).resolves.toMatchObject({ source })
		form.set('source', JSON.stringify(source + 'é'))
		await expect(readInput(form)).rejects.toMatchObject({ status: 413 })
	})

	it('requires optional instructions to be text', async () => {
		const form = editorForm()
		form.set('instructions', new File(['value'], 'value.txt'))
		await expect(readInput(form)).rejects.toMatchObject({ status: 400 })
	})

	it('preserves whitespace and bounds instruction characters, not UTF-8 bytes', async () => {
		const form = editorForm()
		const instructions = ' ' + 'é'.repeat(MAX_INSTRUCTION_CHARS - 2) + ' '
		form.set('instructions', instructions)
		await expect(readInput(form)).resolves.toMatchObject({ instructions })
		form.set('instructions', instructions + 'é')
		await expect(readInput(form)).rejects.toMatchObject({ status: 413 })
	})

	it('reads binary attachments as Buffers', async () => {
		const form = editorForm()
		attach(form, 8)
		attach(form, 4)
		const result = await readInput(form)
		expect(result.files).toEqual([Buffer.alloc(8, 255), Buffer.alloc(4, 255)])
		expect(result.files.every(Buffer.isBuffer)).toBe(true)
	})

	it.each([
		['attachment type', [1], 400],
		['per-file bytes', [1, 9], 413],
		['combined bytes', [8, 5], 413],
		['file count', [1, 1, 1], 413]
	] as const)('checks %s before reading any attachment buffers', async (reason, sizes, status) => {
		const form = editorForm()
		for (const size of sizes) attach(form, size)
		const reads = form.getAll('files').map((file) => vi.spyOn(file as File, 'arrayBuffer'))
		if (reason === 'attachment type') form.append('files', 'not a file')
		await expect(readInput(form)).rejects.toMatchObject({ status })
		for (const bufferRead of reads) expect(bufferRead).not.toHaveBeenCalled()
	})

	it('ignores empty files without counting them toward attachment limits', async () => {
		const form = editorForm()
		for (let i = 0; i < 3; i++) attach(form, 0, 'empty.txt')
		attach(form, 0, '')
		attach(form, 8)
		attach(form, 4)
		await expect(readInput(form)).resolves.toMatchObject({
			files: [Buffer.alloc(8, 255), Buffer.alloc(4, 255)]
		})
	})
})

describe('readFieldsInput', () => {
	it.each([{ keys: ['title'] }, { keys: ['body'] }, { keys: ['title', 'body'] }])(
		'accepts one or more metadata fields, distinct from the body: $keys',
		async ({ keys }) => {
			const form = editorForm()
			form.set('target', 'fields')
			form.set('fields', JSON.stringify(keys))
			form.set('unrelated', 'ignored')
			await expect(readFieldsInput(form)).resolves.toMatchObject({
				keys
			})
		}
	)

	it.each([
		null,
		'not json',
		'null',
		'{}',
		'"title"',
		'[]',
		'[""]',
		'[" "]',
		'["title", 1]',
		'["title", "title"]',
		new File(['["title"]'], 'fields.txt')
	])('requires a nonempty JSON array of distinct text fields: %s', async (fields) => {
		const form = editorForm()
		form.set('target', 'fields')
		form.delete('fields')
		if (fields !== null) form.set('fields', fields)
		await expect(readFieldsInput(form)).rejects.toMatchObject({ status: 400 })
	})
})

it('body input has no field selection, even when fields are submitted', async () => {
	const form = editorForm()
	form.set('fields', 'not a selection')
	const input = await readBodyInput(form)
	expect(input).not.toHaveProperty('keys')
	expect(input).not.toHaveProperty('target')
})
