import { describe, expect, test } from 'vitest'
import * as registry from './sidequest.jobs.js'
import { Publish } from './handlers/publish.js'

describe('sidequest.jobs registry', () => {
	test('exports Publish under its real class name', () => {
		expect(registry.Publish).toBe(Publish)
		expect(Publish.name).toBe('Publish')
	})
})
