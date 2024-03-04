import { describe, expect, test } from 'vitest'
import * as index from './index.js'

// https://github.com/vitest-dev/vitest/issues/3605

describe('src/index.ts', () => {
	test('schema', () => {
		expect(index).toBeDefined()
	})
})
