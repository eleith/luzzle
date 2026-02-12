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
	})

	describe('unsetFrontmatterValue', () => {
		test('unsets top level value', () => {
			const obj: PieceFrontmatter = { title: 'hello', other: 'v' }
			paths.unsetFrontmatterValue(obj, 'title')
			expect(obj.title).toBeUndefined()
			expect(obj.other).toBe('v')
		})

		test('unsets nested value', () => {
			const obj: PieceFrontmatter = { meta: { author: 'Bob', date: '2023' } }
			paths.unsetFrontmatterValue(obj, 'meta.author')
			expect((obj as unknown as Record<string, Record<string, unknown>>).meta.author).toBeUndefined()
			expect((obj as unknown as Record<string, Record<string, unknown>>).meta.date).toBe('2023')
		})

		test('removes from array by index', () => {
			const obj: PieceFrontmatter = { tags: ['a', 'b', 'c'] }
			paths.unsetFrontmatterValue(obj, 'tags.1')
			expect(obj.tags).toEqual(['a', 'c'])
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
					tags: { type: 'array', items: { type: 'string' } }
				}
			},
			{
				name: 'gallery',
				type: 'array',
				items: {
					type: 'object',
					properties: {
						url: { type: 'string' }
					}
				}
			}
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

		test('finds nested field inside array of objects', () => {
			const field = paths.findFrontmatterField(fields, 'gallery.0.url')
			expect(field?.name).toBe('url')
			expect(field?.type).toBe('string')
		})

		test('finds nested field inside array of objects', () => {
			const field = paths.findFrontmatterField(fields, 'gallery.oops.url')
			expect(field).toBeUndefined()
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
})
