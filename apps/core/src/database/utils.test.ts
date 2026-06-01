import { describe, expect, test } from 'vitest'
import * as index from './utils.js'

// https://github.com/vitest-dev/vitest/issues/3605

describe('src/database/util.ts', () => {
	test('schema', () => {
		expect(index).toBeDefined()
	})
})
