import { describe, test, expect, beforeEach } from 'vitest'
import { registerTestConnectivityWorkflow } from './testConnectivity.js'
import { initOpenWorkflow, getOpenWorkflow } from '@luzzle/web.jobs'
import { testConnectivitySpec } from '@luzzle/web.jobs/specs'

describe('workflows/testConnectivity', () => {
	beforeEach(() => {
		initOpenWorkflow({ dbPath: ':memory:' })
	})

	test('registers workflow implementation successfully', () => {
		registerTestConnectivityWorkflow()
		const ow = getOpenWorkflow()

		const registered = (
			ow as unknown as {
				registry: {
					get: (name: string) => { spec: { name: string }; fn: (...args: unknown[]) => unknown }
				}
			}
		).registry.get(testConnectivitySpec.name)
		expect(registered).toBeDefined()
		expect(registered.spec.name).toBe(testConnectivitySpec.name)
		expect(typeof registered.fn).toBe('function')
	})
})
