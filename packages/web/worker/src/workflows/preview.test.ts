import { describe, test, expect, beforeEach } from 'vitest'
import { registerPreviewWorkflow } from './preview.js'
import { initOpenWorkflow, getOpenWorkflow } from '@luzzle/web.jobs/openworkflow'
import { previewSpec } from '@luzzle/web.jobs/specs'

describe('workflows/preview', () => {
	beforeEach(() => {
		initOpenWorkflow({ dbPath: ':memory:' })
	})

	test('registers workflow implementation successfully', () => {
		registerPreviewWorkflow()
		const ow = getOpenWorkflow()

		// Verify the workflow is correctly registered under its name
		const registered = (
			ow as unknown as {
				registry: {
					get: (name: string) => { spec: { name: string }; fn: (...args: unknown[]) => unknown }
				}
			}
		).registry.get(previewSpec.name)
		expect(registered).toBeDefined()
		expect(registered.spec.name).toBe(previewSpec.name)
		expect(typeof registered.fn).toBe('function')
	})
})
