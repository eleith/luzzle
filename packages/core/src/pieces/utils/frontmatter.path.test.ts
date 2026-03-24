import { describe, expect, test } from 'vitest'
import * as paths from './frontmatter.path.js'
import { PieceFrontmatter, PieceFrontmatterSchemaField } from './frontmatter.js'

describe('pieces/utils/frontmatter.path.ts', () => {
	describe('getFrontmatterValue', () => {
		test('gets top level value', () => {
			const obj: PieceFrontmatter = { title: 'hello' }
			expect(paths.getFrontmatterValue(obj, 'title')).toBe('hello')
		})

		test('gets nested value', () => {
			const obj: PieceFrontmatter = { meta: { author: 'Bob' } }
			expect(paths.getFrontmatterValue(obj, 'meta.author')).toBe('Bob')
		})

		test('gets array value', () => {
			const obj: PieceFrontmatter = { tags: ['a', 'b'] }
			expect(paths.getFrontmatterValue(obj, 'tags.1')).toBe('b')
		})

		test('returns undefined for missing path', () => {
			const obj: PieceFrontmatter = { title: 'hello' }
			expect(paths.getFrontmatterValue(obj, 'missing')).toBeUndefined()
			expect(paths.getFrontmatterValue(obj, 'title.sub')).toBeUndefined()
		})

		test('returns first item for collection-like queries', () => {
			const obj: PieceFrontmatter = { gallery: [{ src: '1.jpg' }, { src: '2.jpg' }] }
			expect(paths.getFrontmatterValue(obj, 'gallery.*.src')).toBe('1.jpg')
			expect(paths.getFrontmatterValue(obj, '$..src')).toBe('1.jpg')
		})
	})

	describe('getFrontmatterValues', () => {
		const obj: PieceFrontmatter = {
			title: 'Piece',
			tags: ['a', 'b'],
			gallery: [{ src: '1.jpg' }, { src: '2.jpg' }],
		}

		test('returns array for singular match', () => {
			expect(paths.getFrontmatterValues(obj, 'title')).toEqual(['Piece'])
		})

		test('returns items for wildcard query', () => {
			expect(paths.getFrontmatterValues(obj, 'gallery[*].src')).toEqual(['1.jpg', '2.jpg'])
		})

		test('returns items for recursive descent', () => {
			expect(paths.getFrontmatterValues(obj, '$..src')).toEqual(['1.jpg', '2.jpg'])
		})

		test('returns empty array for missing path', () => {
			expect(paths.getFrontmatterValues(obj, 'missing')).toEqual([])
		})

		test('returns direct array if pointed to directly with wildcard', () => {
			expect(paths.getFrontmatterValues(obj, 'tags[*]')).toEqual(['a', 'b'])
		})

		test('returns wrapped array if pointed to directly without brackets or wildcard', () => {
			expect(paths.getFrontmatterValues(obj, 'tags')).toEqual([['a', 'b']])
		})
	})

	describe('setFrontmatterValue', () => {
		test('sets top level value', () => {
			const obj: PieceFrontmatter = { title: 'old' }
			paths.setFrontmatterValue(obj, 'title', 'new')
			expect(obj.title).toBe('new')
		})

		test('sets nested value (creates objects)', () => {
			const obj: PieceFrontmatter = { title: 't' }
			paths.setFrontmatterValue(obj, 'meta.author', 'Bob')
			expect((obj as unknown as Record<string, Record<string, unknown>>).meta.author).toBe('Bob')
		})

		test('sets nested value (creates arrays for indices)', () => {
			const obj: PieceFrontmatter = { title: 't' }
			paths.setFrontmatterValue(obj, 'list.0', 'item')
			expect(Array.isArray((obj as unknown as Record<string, unknown[]>).list)).toBe(true)
			expect((obj as unknown as Record<string, unknown[]>).list[0]).toBe('item')
		})

		test('throws on an unsafe integer value', () => {
			const obj: PieceFrontmatter = { title: 't', list: ['a'] }
			expect(() => paths.setFrontmatterValue(obj, 'list.100000000000000000', 'item')).toThrow()
		})

		test('appends to existing array', () => {
			const obj: PieceFrontmatter = { tags: ['a'] }
			paths.setFrontmatterValue(obj, 'tags', 'b')
			expect(obj.tags).toEqual(['a', 'b'])
		})

		test('overwrites non-object intermediate paths', () => {
			const obj: PieceFrontmatter = { meta: 'not-an-object' }
			paths.setFrontmatterValue(obj, 'meta.author', 'Bob')
			expect((obj as unknown as Record<string, Record<string, unknown>>).meta.author).toBe('Bob')
		})

		test('throws error when accessing property on array', () => {
			const obj: PieceFrontmatter = { tags: ['a'] }
			expect(() => paths.setFrontmatterValue(obj, 'tags.name', 'Bob')).toThrow(
				/Cannot access property 'name' on Array/
			)
		})

		test('throws error when creating sparse array (index > length)', () => {
			const obj: PieceFrontmatter = { tags: ['a'] }
			expect(() => paths.setFrontmatterValue(obj, 'tags.2', 'c')).toThrow(/Index 2 out of bounds/)
		})

		test('throws error when creating sparse array in nested path (index > length)', () => {
			const obj: PieceFrontmatter = { authors: [{ name: 'A' }] }
			expect(() => paths.setFrontmatterValue(obj, 'authors.2.name', 'C')).toThrow(
				/Index 2 out of bounds/
			)
		})

		test('allows creating next index (index == length)', () => {
			const obj: PieceFrontmatter = { tags: ['a'] }
			paths.setFrontmatterValue(obj, 'tags.1', 'b')
			expect(obj.tags).toEqual(['a', 'b'])
		})

		test('allows creating deeply nested next index', () => {
			const obj: PieceFrontmatter = { authors: [{ name: 'A' }] }
			paths.setFrontmatterValue(obj, 'authors.1.name', 'B')

			expect((obj.authors as unknown[])[1]).toEqual({ name: 'B' })
		})
	})

	describe('unsetFrontmatterValue', () => {
		test('unsets top level value', () => {
			const obj: PieceFrontmatter = { title: 'hello', other: 'v' }
			paths.unsetFrontmatterValue(obj, 'title')
			expect(obj.title).toBeUndefined()
			expect(obj.other).toBe('v')
		})

		test('unsets nested value and prunes empty parents', () => {
			const obj: PieceFrontmatter = { meta: { author: 'Bob' } }
			paths.unsetFrontmatterValue(obj, 'meta.author')
			expect(obj.meta).toBeUndefined()
		})

		test('handles missing paths gracefully', () => {
			const obj: PieceFrontmatter = { title: 't' }
			expect(() => paths.unsetFrontmatterValue(obj, 'missing.path')).not.toThrow()
		})
	})

	describe('findFrontmatterField', () => {
		const fields: PieceFrontmatterSchemaField[] = [
			{ name: 'title', type: 'string' },
			{
				name: 'meta',
				type: 'object',
				properties: {
					author: { type: 'string' },
					tags: { type: 'array', items: { type: 'string' } },
				},
			},
			{
				name: 'gallery',
				type: 'array',
				items: {
					type: 'object',
					properties: {
						url: { type: 'string' },
					},
				},
			},
			{
				name: 'places',
				type: 'array',
				items: {
					type: 'object',
					properties: {
						url: { type: 'string' },
					},
					required: ['url'],
				},
			},
		] as unknown as PieceFrontmatterSchemaField[]

		test('finds top level field', () => {
			const field = paths.findFrontmatterField(fields, 'title')
			expect(field?.name).toBe('title')
			expect(field?.type).toBe('string')
		})

		test('finds nested field', () => {
			const field = paths.findFrontmatterField(fields, 'meta.author')
			expect(field?.name).toBe('author')
			expect(field?.type).toBe('string')
		})

		test('finds array item field via index', () => {
			const field = paths.findFrontmatterField(fields, 'meta.tags.0')
			expect(field?.type).toBe('string')
		})

		test('finds nested field inside array of objects via index', () => {
			const field = paths.findFrontmatterField(fields, 'gallery.0.url')
			expect(field?.name).toBe('url')
		})

		test('finds nested field inside array of objects without index', () => {
			const field = paths.findFrontmatterField(fields, 'gallery.url')
			expect(field?.name).toBe('url')
		})

		test('finds nested required field inside array of objects via index', () => {
			const field = paths.findFrontmatterField(fields, 'places.0.url')
			expect(field?.name).toBe('url')
		})

		test('returns undefined for non-numeric index on scalar array', () => {
			expect(paths.findFrontmatterField(fields, 'meta.tags.oops')).toBeUndefined()
		})

		test('returns undefined for invalid paths', () => {
			expect(paths.findFrontmatterField(fields, 'missing')).toBeUndefined()
			expect(paths.findFrontmatterField(fields, 'title.nested')).toBeUndefined()
			expect(paths.findFrontmatterField(fields, 'meta.missing')).toBeUndefined()
		})

		test('returns undefined for index on non-array', () => {
			expect(paths.findFrontmatterField(fields, 'title.0')).toBeUndefined()
		})

		test('returns undefined for scalar subpath', () => {
			expect(paths.findFrontmatterField(fields, 'meta.author.deep')).toBeUndefined()
		})
	})

	describe('filterFrontmatterFields', () => {
		const fields: PieceFrontmatterSchemaField[] = [
			{ name: 'title', type: 'string' },
			{ name: 'description', type: 'string', format: 'markdown' },
			{ name: 'sections', type: 'array', items: { type: 'string', format: 'markdown' } },
			{
				name: 'chapters',
				type: 'array',
				items: {
					type: 'object',
					properties: {
						title: { type: 'string' },
						body: { type: 'string', format: 'markdown' },
					},
				},
			},
			{
				name: 'meta',
				type: 'object',
				properties: {
					bio: { type: 'string', format: 'markdown' },
					url: { type: 'string' },
				},
			},
			{ name: 'tags', type: 'array', items: { type: 'string' } },
		] as unknown as PieceFrontmatterSchemaField[]

		const isMarkdown = (f: { type?: string; format?: string }) =>
			f.type === 'string' && f.format === 'markdown'

		test('finds scalar markdown fields', () => {
			expect(paths.filterFrontmatterFields(fields, isMarkdown)).toContain('description')
		})

		test('finds array of markdown strings', () => {
			expect(paths.filterFrontmatterFields(fields, isMarkdown)).toContain('sections')
		})

		test('finds markdown inside object', () => {
			expect(paths.filterFrontmatterFields(fields, isMarkdown)).toContain('meta.bio')
		})

		test('finds markdown inside array of objects', () => {
			expect(paths.filterFrontmatterFields(fields, isMarkdown)).toContain('chapters.body')
		})

		test('returns all markdown paths', () => {
			expect(paths.filterFrontmatterFields(fields, isMarkdown)).toEqual([
				'description',
				'sections',
				'chapters.body',
				'meta.bio',
			])
		})

		test('excludes non-matching fields', () => {
			const result = paths.filterFrontmatterFields(fields, isMarkdown)
			expect(result).not.toContain('title')
			expect(result).not.toContain('tags')
			expect(result).not.toContain('meta.url')
			expect(result).not.toContain('chapters.title')
		})

		test('returns empty for no matches', () => {
			expect(
				paths.filterFrontmatterFields(fields, (f) => f.type === 'boolean')
			).toEqual([])
		})
	})

	describe('resolveFieldPaths', () => {
		const fields: PieceFrontmatterSchemaField[] = [
			{ name: 'description', type: 'string', format: 'markdown' },
			{ name: 'sections', type: 'array', items: { type: 'string', format: 'markdown' } },
			{
				name: 'chapters',
				type: 'array',
				items: {
					type: 'object',
					properties: {
						body: { type: 'string', format: 'markdown' },
					},
				},
			},
			{
				name: 'meta',
				type: 'object',
				properties: {
					bio: { type: 'string', format: 'markdown' },
				},
			},
		] as unknown as PieceFrontmatterSchemaField[]

		test('resolves scalar path', () => {
			const data = { description: 'hello' }
			expect(paths.resolveFieldPaths(fields, data, 'description')).toEqual(['description'])
		})

		test('resolves nested object path', () => {
			const data = { meta: { bio: 'hello' } }
			expect(paths.resolveFieldPaths(fields, data, 'meta.bio')).toEqual(['meta.bio'])
		})

		test('resolves array of strings', () => {
			const data = { sections: ['first', 'second', 'third'] }
			expect(paths.resolveFieldPaths(fields, data, 'sections')).toEqual([
				'sections.0',
				'sections.1',
				'sections.2',
			])
		})

		test('resolves array of objects with sub-path', () => {
			const data = { chapters: [{ body: 'ch1' }, { body: 'ch2' }] }
			expect(paths.resolveFieldPaths(fields, data, 'chapters.body')).toEqual([
				'chapters.0.body',
				'chapters.1.body',
			])
		})

		test('returns empty for empty array', () => {
			const data = { sections: [] }
			expect(paths.resolveFieldPaths(fields, data, 'sections')).toEqual([])
		})

		test('returns empty for missing field in schema', () => {
			const data = { unknown: 'value' }
			expect(paths.resolveFieldPaths(fields, data, 'unknown')).toEqual([])
		})

		test('returns empty when frontmatter value is not an array', () => {
			const data = { sections: 'not-an-array' }
			expect(paths.resolveFieldPaths(fields, data, 'sections')).toEqual([])
		})

		test('returns empty when data is missing', () => {
			const data = {}
			expect(paths.resolveFieldPaths(fields, data, 'meta.bio')).toEqual([])
		})
	})
})
