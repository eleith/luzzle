import { describe, expect, test } from 'vitest'
import * as index from './index.js'

// https://github.com/vitest-dev/vitest/issues/3605

describe('index.ts', () => {
	test('schema', () => {
		expect(index).toBeDefined()
	})

	test('preserves the public generation exports without exposing provider internals', () => {
		for (const name of [
			'generatePieceFrontmatter',
			'mergeGeneratedFields',
			'appendGeneratedBody',
			'generatePieceBody',
			'validateApiKey',
		] as const) {
			expect(index[name]).toBeTypeOf('function')
		}
		expect(index.DEFAULT_GENERATION_LIMITS).toBeDefined()
		expect(Object.hasOwn(index, 'generatePieceMetadata')).toBe(false)
		expect(Object.hasOwn(index, 'generateFieldValues')).toBe(false)
		expect(Object.hasOwn(index, 'generateBody')).toBe(false)
		expect(Object.hasOwn(index, 'pieceFrontMatterFromPrompt')).toBe(false)
		expect(Object.hasOwn(index, 'generateFieldValue')).toBe(false)
		expect(Object.hasOwn(index, 'replaceGeneratedBody')).toBe(false)
		expect(Object.hasOwn(index, 'getClient')).toBe(false)
		expect(Object.hasOwn(index, 'runGeneration')).toBe(false)
	})
})
