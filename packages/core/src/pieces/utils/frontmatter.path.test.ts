import { describe, expect, test } from 'vitest'
import * as paths from './frontmatter.path.js'
import { PieceFrontmatter } from './frontmatter.js'

describe('pieces/utils/frontmatter.path.ts', () => {
	describe('get', () => {
		test('gets top level value', () => {
			const obj: PieceFrontmatter = { title: 'hello' }
			expect(paths.get(obj, 'title')).toBe('hello')
		})

		test('gets nested value', () => {
			const obj: PieceFrontmatter = { meta: { author: 'Alice' } }
			expect(paths.get(obj, 'meta.author')).toBe('Alice')
		})

		test('gets array element', () => {
			const obj: PieceFrontmatter = { tags: ['a', 'b'] }
			expect(paths.get(obj, 'tags.1')).toBe('b')
		})

		test('returns undefined for missing path', () => {
			const obj: PieceFrontmatter = { title: 'hello' }
			expect(paths.get(obj, 'missing')).toBeUndefined()
			expect(paths.get(obj, 'title.sub')).toBeUndefined()
		})

		test('returns undefined for null values in path', () => {
			const obj = { meta: null } as unknown as PieceFrontmatter
			expect(paths.get(obj, 'meta.author')).toBeUndefined()
		})
	})

	describe('set', () => {
		test('sets top level value', () => {
			const obj: PieceFrontmatter = {}
			paths.set(obj, 'title', 'hello')
			expect(obj.title).toBe('hello')
		})

		test('sets nested value creating objects', () => {
			const obj: PieceFrontmatter = {}
			paths.set(obj, 'meta.author', 'Alice')
			const meta = obj.meta as Record<string, unknown>
			expect(meta.author).toBe('Alice')
		})

		test('appends to existing array', () => {
			const obj: PieceFrontmatter = { tags: ['a'] }
			paths.set(obj, 'tags', 'b')
			expect(obj.tags).toEqual(['a', 'b'])
		})

		test('overwrites non-array scalar', () => {
			const obj: PieceFrontmatter = { title: 'old' }
			paths.set(obj, 'title', 'new')
			expect(obj.title).toBe('new')
		})

		test('handles existing non-object intermediate values', () => {
			const obj: PieceFrontmatter = { meta: 'not-an-object' } as any
			paths.set(obj, 'meta.author', 'Alice')
			const meta = obj.meta as Record<string, unknown>
			expect(meta.author).toBe('Alice')
		})

		test('handles null intermediate values', () => {
			const obj = { meta: null } as unknown as PieceFrontmatter
			paths.set(obj, 'meta.author', 'Alice')
			const meta = obj.meta as Record<string, unknown>
			expect(meta.author).toBe('Alice')
		})
	})

	describe('unset', () => {
		test('unsets top level key', () => {
			const obj: PieceFrontmatter = { title: 'hello' }
			paths.unset(obj, 'title')
			expect(obj.title).toBeUndefined()
		})

		test('unsets nested key', () => {
			const obj: PieceFrontmatter = { meta: { author: 'Alice' } }
			paths.unset(obj, 'meta.author')
			const meta = obj.meta as Record<string, unknown>
			expect(meta.author).toBeUndefined()
		})

		test('removes array element by index', () => {
			const obj: PieceFrontmatter = { tags: ['a', 'b', 'c'] }
			paths.unset(obj, 'tags.1')
			expect(obj.tags).toEqual(['a', 'c'])
		})

		test('removes whole array if base path given', () => {
			const obj: PieceFrontmatter = { tags: ['a'] }
			paths.unset(obj, 'tags')
			expect(obj.tags).toBeUndefined()
		})

		test('does nothing if path does not exist', () => {
			const obj: PieceFrontmatter = { title: 'hello' }
			paths.unset(obj, 'missing.key')
			expect(obj).toEqual({ title: 'hello' })
		})

		test('handles intermediate null values', () => {
			const obj = { meta: null } as unknown as PieceFrontmatter
			paths.unset(obj, 'meta.author')
			expect(obj.meta).toBeNull()
		})
	})
})
