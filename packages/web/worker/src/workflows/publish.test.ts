import { describe, test, expect, beforeEach } from 'vitest'
import { registerPublishWorkflow } from './publish.js'
import { initOpenWorkflow, getOpenWorkflow } from '@luzzle/web.jobs/openworkflow'
import { publishSpec } from '@luzzle/web.jobs/specs'

describe('workflows/publish', () => {
	beforeEach(() => {
		initOpenWorkflow({ dbPath: ':memory:' })
	})

	test('registers workflow implementation successfully', () => {
		registerPublishWorkflow()
		const ow = getOpenWorkflow()

		// Verify the workflow is correctly registered under its name
		const registered = (
			ow as unknown as {
				registry: {
					get: (name: string) => { spec: { name: string }; fn: (...args: unknown[]) => unknown }
				}
			}
		).registry.get(publishSpec.name)
		expect(registered).toBeDefined()
		expect(registered.spec.name).toBe(publishSpec.name)
		expect(typeof registered.fn).toBe('function')
	})
})
