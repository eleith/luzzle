import { expect, test } from 'vitest'
import type { ProgressPhase } from '#lib/components/progress.js'
import { formatDuration, previewDuration } from './duration.js'

function phase(overrides: Partial<ProgressPhase> = {}): ProgressPhase {
	return {
		phase: 'render',
		status: 'completed',
		started_at: 1000,
		finished_at: 3000,
		message: null,
		...overrides
	}
}

test.each([
	[-1001, '0s'],
	[-1, '0s'],
	[0, '0s'],
	[999, '0s'],
	[1000, '1s'],
	[1999, '1s'],
	[59999, '59s'],
	[60000, '1m 0s'],
	[61999, '1m 1s'],
	[120000, '2m 0s'],
	[3600000, '60m 0s']
])('formatDuration(%s) preserves the console format %s', (ms, expected) => {
	expect(formatDuration(ms)).toBe(expected)
})

test('duration spans the first phase start through the last phase end, not a sum or sorted list', () => {
	const phases = [
		phase({ phase: 'first', started_at: 1000, finished_at: 2000 }),
		phase({ phase: 'middle', started_at: 500, finished_at: 20000 }),
		phase({ phase: 'last', started_at: 5000, finished_at: 7000 })
	]
	expect(previewDuration(phases, 'completed', '2026-01-02T03:05:06Z', 90000)).toBe(6000)
})

test('running duration uses explicit now only when the last phase has not finished', () => {
	expect(previewDuration([phase({ finished_at: null })], 'running', null, 4500)).toBe(3500)
})

test('running duration preserves the old console end when the last phase already finished', () => {
	expect(previewDuration([phase()], 'running', '2026-01-02T03:05:06Z', 90000)).toBe(2000)
})

test.each(['completed', 'failed', 'expired'])(
	'%s uses phase finish in preference to metadata finish or now',
	(status) => {
		expect(previewDuration([phase()], status, '1970-01-01T00:00:09Z', 90000)).toBe(2000)
	}
)

test.each(['completed', 'failed', 'expired'])(
	'%s can fall back to authoritative metadata finish when the last phase has no finish',
	(status) => {
		expect(
			previewDuration([phase({ finished_at: null })], status, '1970-01-01T02:00:04+02:00', 90000)
		).toBe(3000)
	}
)

test.each(['completed', 'failed', 'expired'])(
	'%s missing both finishes is Unknown regardless of now',
	(status) => {
		expect(previewDuration([phase({ finished_at: null })], status, null, 90000)).toBeNull()
	}
)

test.each([null, '', 'not-a-date', '2026-99-99T99:99:99Z'])(
	'invalid terminal metadata finish %j cannot invent a duration',
	(finishedAt) => {
		expect(
			previewDuration([phase({ finished_at: null })], 'completed', finishedAt, 90000)
		).toBeNull()
	}
)

test.each(['running', 'completed', 'failed', 'expired', 'enqueued', 'unknown'])(
	'%s with no phases remains Unknown',
	(status) => {
		expect(previewDuration([], status, '1970-01-01T00:00:09Z', 90000)).toBeNull()
	}
)

test.each(['enqueued', 'waiting', 'unknown', 'constructor', 'toString'])(
	'%s does not infer a measurement even from phase values',
	(status) => {
		expect(previewDuration([phase()], status, '1970-01-01T00:00:09Z', 90000)).toBeNull()
	}
)

test.each([NaN, Infinity, -Infinity])('nonfinite phase start %s is Unknown', (started_at) => {
	expect(previewDuration([phase({ started_at })], 'completed', null, 90000)).toBeNull()
})

test.each([NaN, Infinity, -Infinity])('nonfinite phase finish %s is Unknown', (finished_at) => {
	expect(
		previewDuration([phase({ finished_at })], 'completed', '1970-01-01T00:00:09Z', 90000)
	).toBeNull()
})

test.each([NaN, Infinity, -Infinity])('nonfinite running now %s is Unknown', (now) => {
	expect(previewDuration([phase({ finished_at: null })], 'running', null, now)).toBeNull()
})

test('zero start and finish are both known, including metadata epoch zero', () => {
	expect(
		previewDuration([phase({ started_at: 0, finished_at: 2000 })], 'completed', null, 90000)
	).toBe(2000)
	expect(previewDuration([phase({ started_at: 0, finished_at: 0 })], 'running', null, 90000)).toBe(
		0
	)
	expect(
		previewDuration(
			[phase({ started_at: 0, finished_at: null })],
			'completed',
			'1970-01-01T00:00:00Z',
			90000
		)
	).toBe(0)
})

test('negative spans clamp to zero', () => {
	expect(previewDuration([phase({ started_at: 4000 })], 'failed', null, 90000)).toBe(0)
	expect(previewDuration([phase({ finished_at: null })], 'running', null, 500)).toBe(0)
})

test('measurement never changes the input phases', () => {
	const phases = [phase({ phase: 'first' }), phase({ phase: 'last', finished_at: null })]
	const before = structuredClone(phases)
	phases.forEach(Object.freeze)
	Object.freeze(phases)
	expect(previewDuration(phases, 'running', null, 5000)).toBe(4000)
	expect(phases).toEqual(before)
})
