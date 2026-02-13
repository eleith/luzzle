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

		test('sets nested value (creates arrays for indices)', () => {
			const obj: PieceFrontmatter = { title: 't' }
			paths.setFrontmatterValue(obj, 'list.0', 'item')
			expect(Array.isArray((obj as unknown as Record<string, unknown[]>).list)).toBe(true)
			expect((obj as unknown as Record<string, unknown[]>).list[0]).toBe('item')
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

		// New Tests for Safety Fixes
		test('throws error when accessing property on array', () => {
			const obj: PieceFrontmatter = { tags: ['a'] }
			expect(() => paths.setFrontmatterValue(obj, 'tags.name', 'Bob')).toThrow(/Cannot access property 'name' on Array/)
		})

		test('throws error when creating sparse array (index > length)', () => {
			const obj: PieceFrontmatter = { tags: ['a'] }
			expect(() => paths.setFrontmatterValue(obj, 'tags.2', 'c')).toThrow(/Index 2 out of bounds/)
		})

		test('throws error when creating sparse array in nested path (index > length)', () => {
			const obj: PieceFrontmatter = { authors: [{ name: 'A' }] }
			// authors length is 1. index 2 is out of bounds.
			expect(() => paths.setFrontmatterValue(obj, 'authors.2.name', 'C')).toThrow(/Index 2 out of bounds/)
		})

		test('allows creating next index (index == length)', () => {
			const obj: PieceFrontmatter = { tags: ['a'] }
			paths.setFrontmatterValue(obj, 'tags.1', 'b')
			expect(obj.tags).toEqual(['a', 'b'])
		})
        
        test('allows creating deeply nested next index', () => {
            const obj: PieceFrontmatter = { authors: [{ name: 'A' }] }
            // authors is length 1. Next index is 1.
            paths.setFrontmatterValue(obj, 'authors.1.name', 'B')
            // Should create object at index 1 with name 'B'
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

		test('finds nested field inside array of objects via index', () => {
			const field = paths.findFrontmatterField(fields, 'gallery.0.url')
			expect(field?.name).toBe('url')
		})

		test('finds nested field inside array of objects without index', () => {
			const field = paths.findFrontmatterField(fields, 'gallery.url')
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
})
