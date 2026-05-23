import { describe, test, expect } from 'vitest'
import { Publish, Preview, JobProgressPurge } from './stubs.js'

describe('job stubs', () => {
	test('Publish.name dispatches to worker class', () => {
		expect(Publish.name).toBe('Publish')
	})

	test('Preview.name dispatches to worker class', () => {
		expect(Preview.name).toBe('Preview')
	})

	test('JobProgressPurge.name dispatches to worker class', () => {
		expect(JobProgressPurge.name).toBe('JobProgressPurge')
	})
})
