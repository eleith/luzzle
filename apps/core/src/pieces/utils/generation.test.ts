import { describe, expect, test } from 'vitest'
import { addFrontMatter } from '../../lib/frontmatter.js'
import { extractFullMarkdown } from '../../lib/markdown.js'
import { mergeGeneratedFields, appendGeneratedBody } from './generation.js'

const source = `---
title: Old title
body: Metadata, not the Markdown body
nullable: null
nested:
  untouched: true
tags: [one, two]
cover: .assets/books/local.jpg
---
# Unsaved notes

Keep **this** text and [link](https://example.com).
`

describe('mergeGeneratedFields', () => {
	test('merges only supplied top-level fields, retaining metadata and the body', async () => {
		const fields = Object.freeze({ title: 'New title', body: 'New metadata', added: null })
		const original = await extractFullMarkdown(source)
		const result = await mergeGeneratedFields(source, fields)
		expect(await extractFullMarkdown(result)).toEqual({
			frontmatter: {
				title: 'New title',
				body: 'New metadata',
				nested: { untouched: true },
				tags: ['one', 'two'],
				cover: '.assets/books/local.jpg',
			},
			markdown: original.markdown,
		})
		expect(fields).toEqual({ title: 'New title', body: 'New metadata', added: null })
	})

	test('skips generated nulls before merging and removes existing null fields', async () => {
		const fields = Object.freeze({ title: null, unknown: null })
		const result = await extractFullMarkdown(await mergeGeneratedFields(source, fields))
		expect(result.frontmatter.title).toBe('Old title')
		expect(result.frontmatter).not.toHaveProperty('unknown')
		expect(result.frontmatter).not.toHaveProperty('nullable')
		expect(fields).toEqual({ title: null, unknown: null })
	})

	test('recursively omits nulls without mutating inputs or removing falsy values and literal text', async () => {
		const existing = {
			removed: null,
			nested: { removed: null, values: [null, false, 0, '', 'null', { removed: null, kept: true }] },
			replaced: { old: 'must not be deep merged' },
			tags: ['old'],
		}
		const fields = Object.freeze({
			replaced: Object.freeze({
				removed: null,
				values: Object.freeze([null, Object.freeze({ removed: null, kept: 'null' }), Object.freeze([null, 0])]),
			}),
			tags: Object.freeze([null, false, 0, '']),
			emptyObject: Object.freeze({ removed: null }),
			emptyArray: Object.freeze([null]),
			flag: false,
			count: 0,
			text: '',
			literal: 'null',
		})
		const originalFields = structuredClone(fields)
		const body = '# null\n\nKeep **null** and `null` verbatim.'
		const input = addFrontMatter(body, existing)
		const result = await extractFullMarkdown(await mergeGeneratedFields(input, fields))
		expect(result).toEqual({
			frontmatter: {
				nested: { values: [false, 0, '', 'null', { kept: true }] },
				replaced: { values: [{ kept: 'null' }, [0]] },
				tags: [false, 0, ''],
				emptyObject: {},
				emptyArray: [],
				flag: false,
				count: 0,
				text: '',
				literal: 'null',
			},
			markdown: body,
		})
		expect(fields).toEqual(originalFields)
		expect((await extractFullMarkdown(input)).frontmatter).toEqual(existing)
		expect(input).toBe(addFrontMatter(body, existing))
	})

	test('preserves tagged YAML timestamps instead of treating them as empty mappings', async () => {
		const input = '---\ntitle: Old\npublished: !!timestamp 2020-01-01\n---\nNotes'
		const original = await extractFullMarkdown(input)
		expect(original.frontmatter.published).toBeInstanceOf(Date)
		expect(await mergeGeneratedFields(input, { title: 'New' })).toBe(
			addFrontMatter(original.markdown, { ...original.frontmatter, title: 'New' })
		)
	})

	test('preserves shared and cyclic YAML aliases while removing their null entries', async () => {
		const input = '---\ntitle: Old\nnested: &a { kept: true, removed: null, ref: *a }\nalias: *a\nlist: &b [null, *b]\n---\nNotes'
		const { frontmatter, markdown } = await extractFullMarkdown(
			await mergeGeneratedFields(input, { title: 'New' })
		)
		const nested = frontmatter.nested as Record<string, unknown>
		const list = frontmatter.list as unknown[]
		expect(frontmatter.title).toBe('New')
		expect(nested.kept).toBe(true)
		expect(nested).not.toHaveProperty('removed')
		expect(nested.ref).toBe(nested)
		expect(frontmatter.alias).toBe(nested)
		expect(list).toHaveLength(1)
		expect(list[0]).toBe(list)
		expect(markdown).toBe('Notes')
	})

	test('preserves unselected entries from YAML ordered maps', async () => {
		const input = '---\n!!omap\n- title: Old\n- keep: Important\n---\nNotes'
		const result = await extractFullMarkdown(await mergeGeneratedFields(input, { title: 'New' }))
		expect(result.frontmatter).toEqual({ title: 'New', keep: 'Important' })
		expect(result.markdown).toBe('Notes')
	})

	test('updating an aliased field keeps the unselected alias value', async () => {
		const input = '---\nfirst: &a { name: Old }\nsecond: *a\n---\nNotes'
		const result = await extractFullMarkdown(await mergeGeneratedFields(input, { first: { name: 'New' } }))
		expect(result.frontmatter).toEqual({ first: { name: 'New' }, second: { name: 'Old' } })
	})

	test('cleans null-prototype mappings without mutating their keys', async () => {
		const nested = Object.assign(Object.create(null), { removed: null, kept: 0 })
		const result = await extractFullMarkdown(await mergeGeneratedFields('', { nested }))
		expect(result.frontmatter.nested).toEqual({ kept: 0 })
		expect(nested.removed).toBeNull()
		expect(Object.getPrototypeOf(nested)).toBeNull()
	})

	test('removes existing nested nulls even when no fields are generated', async () => {
		const input = addFrontMatter('null', { removed: null, nested: [{ removed: null }, null] })
		expect(await mergeGeneratedFields(input, {})).toBe(addFrontMatter('null', { nested: [{}] }))
	})

	test('replaces complete objects and arrays without mutating generated values or resolving URLs', async () => {
		const fields = Object.freeze({
			nested: Object.freeze({ replacement: 'value' }),
			tags: Object.freeze(['new']),
			cover: 'https://example.com/cover.jpg',
		})
		const result = await extractFullMarkdown(await mergeGeneratedFields(source, fields))
		expect(result.frontmatter).toMatchObject(fields)
		expect(result.frontmatter.nested).toEqual({ replacement: 'value' })
		expect(fields.nested).toEqual({ replacement: 'value' })
		expect(fields.tags).toEqual(['new'])
	})

	test('supports one, many, all, or no provided fields', async () => {
		const initial = addFrontMatter('Notes', { title: 'old', count: 1 })
		for (const fields of [{ title: 'new' }, { title: 'new', count: 2 }, {}]) {
			expect(await mergeGeneratedFields(initial, fields)).toBe(
				addFrontMatter('Notes', { title: 'old', count: 1, ...fields })
			)
		}
	})

	test('does not interpret literal field names as paths or mutate prototypes', async () => {
		const fields = JSON.parse('{"a.b":"literal","__proto__":{"safe":true}}')
		const result = await extractFullMarkdown(await mergeGeneratedFields('', fields))
		expect(result.frontmatter).toEqual(fields)
		expect(Object.getPrototypeOf(result.frontmatter)).toBe(Object.prototype)
	})
})

describe('appendGeneratedBody', () => {
	test('preserves the entire source, including unselected metadata, a body field, and unsaved notes', async () => {
		const original = await extractFullMarkdown(source)
		const body = '# Generated\n\nNew **notes** and literal null.'
		const result = await appendGeneratedBody(source, body)
		expect(result).toBe(`${source}\n\n${body}`)
		expect(result.slice(0, source.length)).toBe(source)
		expect((await extractFullMarkdown(result)).frontmatter).toEqual(original.frontmatter)
	})

	test('preserves comments, quoted metadata, CRLF, and body whitespace verbatim', async () => {
		const input = '---\r\n# keep this comment\r\ntitle: "Old" # inline comment\r\nbody: Metadata body\r\nextra: [one, two]\r\n---\r\n\r\n# Unsaved notes\r\n  Keep **this** text.  \r\n'
		const body = '\n# More notes\r\n\n  trailing whitespace  \n'
		expect(await appendGeneratedBody(input, body)).toBe(`${input}\n\n${body}`)
	})

	test.each(['Notes', 'Notes\n', 'Notes\r\n', 'Notes\n\n'])(
		'adds exactly the separator without normalizing existing trailing newlines: %j', async (input) => {
			expect(await appendGeneratedBody(input, 'New notes\n')).toBe(`${input}\n\nNew notes\n`)
		}
	)

	test.each([source, '', '  Notes  \r\n', '---\r\n# comment\r\ntitle: "Old"\r\n---\r\nNotes'])(
		'returns the original source unchanged for an empty generated body: %j', async (input) => {
			expect(await appendGeneratedBody(input, '')).toBe(input)
		}
	)

	test.each(['', '# New notes', '\nNew notes  \r\n', ' \n '])(
		'returns generated text verbatim for empty source: %j', async (body) => {
			expect(await appendGeneratedBody('', body)).toBe(body)
		}
	)

	test('does not trim nonempty generated whitespace', async () => {
		expect(await appendGeneratedBody(source, ' \n ')).toBe(`${source}\n\n \n `)
	})
})

describe('generated document serialization', () => {
	test.each(['', '# Notes\n\nUnchanged body', '--- not a fence\ntext'])(
		'accepts source without frontmatter: %j', async (input) => {
			expect(await mergeGeneratedFields(input, { title: 'New' })).toBe(
				addFrontMatter(input, { title: 'New' })
			)
			expect(await appendGeneratedBody(input, 'New body')).toBe(input ? `${input}\n\nNew body` : 'New body')
		}
	)

	test('accepts a mapping and CRLF fences, normalizing only metadata merges like Save', async () => {
		const input = '---\r\n# comment\r\ntitle: "Old"\r\n---\r\n Notes \r\n'
		expect(await mergeGeneratedFields(input, { count: 2 })).toBe(
			addFrontMatter('Notes', { title: 'Old', count: 2 })
		)
		expect(await appendGeneratedBody('---\n{}\n---\nold', 'new')).toBe('---\n{}\n---\nold\n\nnew')
	})

	test.each([
		'---\n- list\n---\nNotes',
		'---\nscalar\n---\nNotes',
		'---\n42\n---\nNotes',
		'---\nnull\n---\nNotes',
		'---\n---\nNotes',
		'---\ntitle: [broken\n---\nNotes',
		'---\ntitle: one\ntitle: two\n---\nNotes',
	])('rejects nonmapping or invalid frontmatter without losing data: %j', async (input) => {
		await expect(mergeGeneratedFields(input, { title: 'New' })).rejects.toThrow()
	})

	test('uses the Markdown parser interpretation instead of checking fences separately', async () => {
		const input = '---\ntitle: unclosed\nNotes'
		expect(await mergeGeneratedFields(input, { title: 'New' })).toBe(
			addFrontMatter(input, { title: 'New' })
		)
	})

	test('appending does not inspect or rewrite existing frontmatter', () => {
		const input = '---\ntitle: [unfinished'
		expect(appendGeneratedBody(input, 'New notes')).toBe(`${input}\n\nNew notes`)
	})
})
