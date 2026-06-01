import { describe, test, expect, beforeEach } from 'vitest'
import { registerJobProgressPurgeWorkflow } from './job-progress-purge.js'
import { initOpenWorkflow, getOpenWorkflow } from '@luzzle/web.jobs/openworkflow'
import { jobProgressPurgeSpec } from '@luzzle/web.jobs/specs'

describe('workflows/job-progress-purge', () => {
	beforeEach(() => {
		initOpenWorkflow({ dbPath: ':memory:' })
	})

	test('registers workflow implementation successfully', () => {
		registerJobProgressPurgeWorkflow()
		const ow = getOpenWorkflow()

		// Verify the workflow is correctly registered under its name
		const registered = (
			ow as unknown as {
				registry: {
					get: (name: string) => { spec: { name: string }; fn: (...args: unknown[]) => unknown }
				}
			}
		).registry.get(jobProgressPurgeSpec.name)
		expect(registered).toBeDefined()
		expect(registered.spec.name).toBe(jobProgressPurgeSpec.name)
		expect(typeof registered.fn).toBe('function')
	})
})
