import { expect, test } from 'vitest'
import { latestPhases, mergePhaseLogs, type JobProgressLog } from './progress.js'

function phaseLog(overrides: Partial<JobProgressLog> = {}): JobProgressLog {
	return {
		job_id: 'job-one',
		phase: 'cdn.sync',
		line_number: 1,
		ts: 100,
		level: 'info',
		message: 'Syncing',
		...overrides
	}
}

test('SSR seed and SSE replay retain each log identity once and append new lines in order', () => {
	const first = phaseLog()
	const second = phaseLog({ line_number: 2, message: 'Synced' })
	const seeded = mergePhaseLogs({}, [first, { ...first }])
	expect(seeded).toEqual({ 'cdn.sync': [first] })
	expect(mergePhaseLogs(seeded, [second, { ...first }])).toEqual({
		'cdn.sync': [first, second]
	})
	expect(mergePhaseLogs({}, [])).toEqual({})
})

test('repeated stream frames retain unique log keys', () => {
	const frame = [phaseLog({ line_number: 3 }), phaseLog(), phaseLog({ line_number: 2 })]
	const first = mergePhaseLogs({}, frame)
	const replayed = mergePhaseLogs(
		first,
		frame.map((row) => ({ ...row }))
	)
	expect(replayed).toEqual(first)
	expect(replayed['cdn.sync'].map((row) => row.line_number)).toEqual([1, 2, 3])
	const keys = replayed['cdn.sync'].map((row) => `${row.job_id}:${row.line_number}`)
	expect(new Set(keys).size).toBe(keys.length)
})

test('log identity includes both job and phase as well as line number', () => {
	const first = phaseLog()
	const otherJob = phaseLog({ job_id: 'job-two' })
	const otherPhase = phaseLog({ phase: 'cache.purge' })
	const later = phaseLog({ job_id: 'job-two', line_number: 2 })
	const seeded = mergePhaseLogs({}, [later, first, otherPhase])
	const merged = mergePhaseLogs(seeded, [otherJob, { ...first }, { ...otherPhase }])
	expect(merged).toEqual({
		'cdn.sync': [first, otherJob, later],
		'cache.purge': [otherPhase]
	})
})

test('identical log payloads remain distinct when line identities differ', () => {
	const first = phaseLog()
	const second = phaseLog({ line_number: 2 })
	expect(mergePhaseLogs({}, [second, first, { ...first }])).toEqual({
		'cdn.sync': [first, second]
	})
})

test('incoming rows replace existing identities with the freshest supplied row', () => {
	const first = phaseLog()
	const next = phaseLog({ line_number: 2 })
	const update = phaseLog({ ts: 200, level: 'warn', message: 'Retrying' })
	const freshest = phaseLog({ ts: 300, level: 'error', message: 'Failed' })
	const merged = mergePhaseLogs({ 'cdn.sync': [first, next] }, [update, freshest])
	expect(merged).toEqual({ 'cdn.sync': [freshest, next] })
	expect(merged['cdn.sync'][0]).toBe(freshest)
})

test('merging logs does not mutate input records, arrays, or rows', () => {
	const current = {
		'cdn.sync': [phaseLog({ line_number: 3 }), phaseLog()],
		'cache.purge': [phaseLog({ phase: 'cache.purge' })]
	}
	const incoming = [phaseLog({ line_number: 2 }), phaseLog({ message: 'Updated' })]
	const beforeCurrent = structuredClone(current)
	const beforeIncoming = structuredClone(incoming)
	for (const rows of [...Object.values(current), incoming]) {
		for (const row of rows) Object.freeze(row)
		Object.freeze(rows)
	}
	Object.freeze(current)
	const merged = mergePhaseLogs(current, incoming)
	expect(current).toEqual(beforeCurrent)
	expect(incoming).toEqual(beforeIncoming)
	expect(merged).not.toBe(current)
	expect(merged['cdn.sync']).not.toBe(current['cdn.sync'])
	expect(merged['cache.purge']).not.toBe(current['cache.purge'])
	expect(merged['cdn.sync'].map((row) => row.line_number)).toEqual([1, 2, 3])
	expect(mergePhaseLogs(current, [])).toEqual({
		'cdn.sync': [current['cdn.sync'][1], current['cdn.sync'][0]],
		'cache.purge': current['cache.purge']
	})
})

test('retry attempts collapse to the latest state per phase without changing phase order', () => {
	const first = { phase: 'assets.generate', status: 'completed' }
	const failed = { phase: 'cdn.sync', status: 'failed' }
	const retry = { phase: 'cdn.sync', status: 'completed' }
	const cache = { phase: 'cache.purge', status: 'completed' }
	const rows = [first, failed, retry, cache]
	expect(latestPhases(rows)).toEqual([first, retry, cache])
	expect(rows).toEqual([first, failed, retry, cache])
	expect(latestPhases([])).toEqual([])
})
