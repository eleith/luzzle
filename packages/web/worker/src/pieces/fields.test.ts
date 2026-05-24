import { describe, test, expect } from 'vitest'
import type { Config } from '@luzzle/web.config'
import { resolveFromFrontmatter } from './fields.js'

type PieceConfig = Config['pieces'][number]

const fullConfig = {
	type: 'books',
	fields: {
		title: 'title',
		date_consumed: 'date_read',
		summary: 'description',
		tags: 'keywords',
	},
} as unknown as PieceConfig

describe('resolveFromFrontmatter', () => {
	test('extracts all fields from frontmatter', () => {
		const fm = { title: 'My Book', date_read: 1700000000, description: 'A summary', keywords: ['fiction', 'sci-fi'] }
		const result = resolveFromFrontmatter(fm, fullConfig)

		expect(result.title).toBe('My Book')
		expect(result.dateConsumed).toBe(1700000000)
		expect(result.summary).toBe('A summary')
		expect(result.keywords).toEqual(['fiction', 'sci-fi'])
	})

	test('defaults title to empty string when missing', () => {
		const result = resolveFromFrontmatter({}, fullConfig)
		expect(result.title).toBe('')
	})

	test('returns undefined summary when field not in config', () => {
		const config = {
			type: 'notes',
			fields: { title: 'title', date_consumed: 'date' },
		} as unknown as PieceConfig

		const result = resolveFromFrontmatter({ title: 'Note' }, config)
		expect(result.summary).toBeUndefined()
	})

	test('returns empty keywords when tags field not in config', () => {
		const config = {
			type: 'notes',
			fields: { title: 'title', date_consumed: 'date' },
		} as unknown as PieceConfig

		const result = resolveFromFrontmatter({ title: 'Note' }, config)
		expect(result.keywords).toEqual([])
	})

	test('filters falsy values from keywords', () => {
		const fm = { title: 'X', keywords: ['valid', '', null, 'also-valid'] }
		const result = resolveFromFrontmatter(fm, fullConfig)
		expect(result.keywords).toEqual(['valid', 'also-valid'])
	})

	test('returns undefined dateConsumed when not in frontmatter', () => {
		const fm = { title: 'No Date' }
		const result = resolveFromFrontmatter(fm, fullConfig)
		expect(result.dateConsumed).toBeUndefined()
	})
})
