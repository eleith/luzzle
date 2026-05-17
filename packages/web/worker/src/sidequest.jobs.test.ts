import { describe, expect, test } from 'vitest'
import * as registry from './sidequest.jobs.js'
import { Publish } from './jobs/publish.js'
import { JobProgressPurge } from './jobs/job-progress-purge.js'
import { Preview } from './jobs/preview.js'

describe('sidequest.jobs registry', () => {
	test('exports Publish under its real class name', () => {
		expect(registry.Publish).toBe(Publish)
		expect(Publish.name).toBe('Publish')
	})

	test('exports JobProgressPurge under its real class name', () => {
		expect(registry.JobProgressPurge).toBe(JobProgressPurge)
		expect(JobProgressPurge.name).toBe('JobProgressPurge')
	})

	test('exports Preview under its real class name', () => {
		expect(registry.Preview).toBe(Preview)
		expect(Preview.name).toBe('Preview')
	})
})
