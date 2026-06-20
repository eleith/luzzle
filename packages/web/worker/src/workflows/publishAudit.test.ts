import { describe, test, expect, beforeEach } from 'vitest'
import { registerPublishAuditWorkflow } from './publishAudit.js'
import { initOpenWorkflow, getOpenWorkflow } from '@luzzle/web.jobs'
import { publishAuditSpec } from '@luzzle/web.jobs/specs'

describe('workflows/publishAudit', () => {
	beforeEach(() => {
		initOpenWorkflow({ dbPath: ':memory:' })
	})

	test('registers workflow implementation successfully', () => {
		registerPublishAuditWorkflow()
		const ow = getOpenWorkflow()

		const registered = (
			ow as unknown as {
				registry: {
					get: (name: string) => { spec: { name: string }; fn: (...args: unknown[]) => unknown }
				}
			}
		).registry.get(publishAuditSpec.name)
		expect(registered).toBeDefined()
		expect(registered.spec.name).toBe(publishAuditSpec.name)
		expect(typeof registered.fn).toBe('function')
	})
})
