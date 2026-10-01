import { describe, expect, test } from 'vitest'
import * as index from './index.js'

// https://github.com/vitest-dev/vitest/issues/3605

describe('index.ts', () => {
	test('schema', () => {
		expect(index).toBeDefined()
	})

	test('preserves the public generation exports without exposing provider internals', () => {
		for (const name of [
			'generatePieceMetadata',
			'generateFieldValue',
			'generateBody',
			'pieceFrontMatterFromPrompt',
			'validateApiKey',
		] as const) {
			expect(index[name]).toBeTypeOf('function')
		}
		expect(index.DEFAULT_GENERATION_LIMITS).toBeDefined()
		expect(Object.hasOwn(index, 'getClient')).toBe(false)
		expect(Object.hasOwn(index, 'runGeneration')).toBe(false)
	})
})
