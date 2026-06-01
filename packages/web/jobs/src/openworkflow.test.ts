import { describe, expect, test } from 'vitest'
import { initOpenWorkflow, getOpenWorkflow } from './openworkflow.js'

describe('openworkflow client initialization', () => {
	test('throws before initialization', () => {
		expect(() => getOpenWorkflow()).toThrow(/has not been initialized/)
	})

	test('initializes and returns singleton instance', () => {
		const client = initOpenWorkflow({ dbPath: ':memory:' })
		expect(client).toBeDefined()
		expect(getOpenWorkflow()).toBe(client)
	})
})
