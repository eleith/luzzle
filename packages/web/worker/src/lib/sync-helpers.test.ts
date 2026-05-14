import { describe, test, expect } from 'vitest'
import type { LuzzleSelectable } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import {
	slugify,
	generateUniqueSlug,
	sanitizeMetadata,
	buildWebPiece,
} from './sync-helpers.js'

describe('slugify', () => {
	test('lowercases and replaces whitespace', () => {
		expect(slugify('Hello World')).toBe('hello-world')
	})

	test('strips diacritics', () => {
		expect(slugify('Café résumé')).toBe('cafe-resume')
	})

	test('collapses repeated dashes', () => {
		expect(slugify('foo --- bar')).toBe('foo-bar')
	})

	test('removes punctuation', () => {
		expect(slugify("it's: a!! test??")).toBe('its-a-test')
	})

	test('returns empty for empty input', () => {
		expect(slugify('')).toBe('')
	})
})

describe('generateUniqueSlug', () => {
	test('uses base slug when unused', () => {
		const used = new Set<string>()
		expect(generateUniqueSlug(used, 'my piece')).toBe('my-piece')
		expect(used.has('my-piece')).toBe(true)
	})

	test('appends counter when base is taken', () => {
		const used = new Set<string>(['my-piece'])
		expect(generateUniqueSlug(used, 'my piece')).toBe('my-piece--1')
		expect(used.has('my-piece--1')).toBe(true)
	})

	test('increments until unused candidate found', () => {
		const used = new Set<string>(['my-piece', 'my-piece--1', 'my-piece--2'])
		expect(generateUniqueSlug(used, 'my piece')).toBe('my-piece--3')
	})
})

describe('sanitizeMetadata', () => {
	test('returns input unchanged when pathToKey is empty', () => {
		const json = '{"image":"path/to/file.png"}'
		expect(sanitizeMetadata(json, new Map())).toBe(json)
	})

	test('replaces matching string values with their keys', () => {
		const json = '{"image":"path/to/file.png","title":"hello"}'
		const map = new Map([['path/to/file.png', 'abc123']])
		const result = JSON.parse(sanitizeMetadata(json, map))
		expect(result.image).toBe('abc123')
		expect(result.title).toBe('hello')
	})

	test('does not replace strings outside the map', () => {
		const json = '{"image":"other.png"}'
		const map = new Map([['path/to/file.png', 'abc123']])
		expect(JSON.parse(sanitizeMetadata(json, map)).image).toBe('other.png')
	})

	test('leaves non-string values untouched', () => {
		const json = '{"count":42,"flag":true,"nested":{"k":"v"}}'
		const map = new Map([['k', 'replaced']])
		const result = JSON.parse(sanitizeMetadata(json, map))
		expect(result.count).toBe(42)
		expect(result.flag).toBe(true)
		expect(result.nested.k).toBe('v')
	})
})

describe('buildWebPiece', () => {
	const item: LuzzleSelectable<'pieces_items'> = {
		id: 'item-1',
		type: 'books',
		file_path: 'books/great.md',
		frontmatter_json: '{}',
		note_markdown: 'a note',
		assets_json_array: '[]',
		date_added: 1700000000,
		date_updated: 1700001000,
		filename: 'great.md',
		cache_id: null,
	} as unknown as LuzzleSelectable<'pieces_items'>

	const pieceConfig = {
		type: 'books',
		fields: {
			title: 'title',
			date_consumed: 'date_consumed',
			summary: 'summary',
			tags: 'tags',
		},
	} as unknown as Config['pieces'][number]

	test('maps item + frontmatter into WebPieces row', () => {
		const fm = { title: 'Great Book', date_consumed: 1700000500, summary: 'summary text' }
		const result = buildWebPiece(item, pieceConfig, 'great', 'salt', fm, ['fiction'])

		expect(result.id).toBe('item-1')
		expect(result.slug).toBe('great')
		expect(result.type).toBe('books')
		expect(result.title).toBe('Great Book')
		expect(result.summary).toBe('summary text')
		expect(result.note).toBe('a note')
		expect(result.date_added).toBe(1700000000)
		expect(result.date_consumed).toBe(1700000500)
		expect(result.date_updated).toBe(1700001000)
		expect(result.keywords).toBe(JSON.stringify(['fiction']))
		expect(result.json_metadata).toBe('{}')
		expect(result.key).toMatch(/^[a-f0-9]{64}$/)
	})

	test('omits keywords when empty', () => {
		const fm = { title: 'No Tags' }
		const result = buildWebPiece(item, pieceConfig, 'no-tags', 'salt', fm, [])
		expect(result.keywords).toBeUndefined()
	})

	test('omits date_updated when item lacks it', () => {
		const noUpdate = { ...item, date_updated: undefined } as unknown as LuzzleSelectable<'pieces_items'>
		const result = buildWebPiece(noUpdate, pieceConfig, 's', 'salt', {}, [])
		expect(result.date_updated).toBeUndefined()
	})

	test('uses empty title when frontmatter title missing', () => {
		const result = buildWebPiece(item, pieceConfig, 's', 'salt', {}, [])
		expect(result.title).toBe('')
	})

	test('omits summary lookup when piece config has no summary field', () => {
		const cfgNoSummary = {
			type: 'books',
			fields: { title: 'title', date_consumed: 'date_consumed' },
		} as unknown as Config['pieces'][number]
		const result = buildWebPiece(item, cfgNoSummary, 's', 'salt', { title: 't', summary: 'ignored' }, [])
		expect(result.summary).toBeUndefined()
	})

	test('key depends on file_path + salt', () => {
		const fm = {}
		const a = buildWebPiece(item, pieceConfig, 's', 'salt-a', fm, [])
		const b = buildWebPiece(item, pieceConfig, 's', 'salt-b', fm, [])
		expect(a.key).not.toBe(b.key)
	})
})
