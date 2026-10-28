import { expect, test } from 'vitest'
import type { PiecesDiff } from '@luzzle/core'
import {
	getRunKind,
	editorHref,
	publishedHref,
	latestPhases,
	mergePhaseLogs,
	type PhaseLog,
	selectablePaths,
	initialSelection,
	toggleSelection,
	canPublishSelection,
	retainSelection,
	recordPublication,
	completionReport,
	pendingAfterPublication,
	type PublicationOutcome
} from './report.js'

function pendingChanges(): PiecesDiff {
	return {
		schemas: { added: [], updated: [], pruned: [] },
		pieces: { added: ['books/new.book.md'], updated: ['books/edited.book.md'], pruned: [] }
	}
}

test('completion failures survive a rejected refresh with stale running metadata', () => {
	const failures = [{ filePath: 'books/failed.book.md', message: 'missing image' }]
	const stalePublication = {
		jobId: 'publish-id',
		state: 'running',
		diff: null,
		failedPieces: []
	}
	const report = completionReport(
		{ id: 'publish-id', refreshed: false, failures },
		stalePublication
	)
	expect(report).toEqual({ diff: null, failedPieces: failures })
	expect(recordPublication(report.diff, report.failedPieces)).toEqual([
		{ filePath: 'books/failed.book.md', state: 'failed', message: 'missing image' }
	])
	expect(stalePublication.failedPieces).toEqual([])
})

test('fresh metadata supplies the diff while completion events supply failures', () => {
	const failures = [{ filePath: 'books/edited.book.md', message: 'missing image' }]
	const diff = pendingChanges()
	const publication = { jobId: 'publish-id', state: 'completed', diff, failedPieces: [] }

	const report = completionReport({ id: 'publish-id', refreshed: true, failures }, publication)

	expect(report).toEqual({ diff, failedPieces: failures })
	expect(recordPublication(report.diff, report.failedPieces)).toEqual([
		{ filePath: 'books/new.book.md', state: 'published' },
		{ filePath: 'books/edited.book.md', state: 'failed', message: 'missing image' }
	])
})

test.each([
	{ name: 'unrefreshed metadata', jobId: 'publish-id', state: 'completed', refreshed: false },
	{ name: 'another run', jobId: 'another-id', state: 'completed', refreshed: true },
	{ name: 'still running', jobId: 'publish-id', state: 'running', refreshed: true }
])('completion does not trust the diff from $name', ({ jobId, state, refreshed }) => {
	const failures = [{ filePath: 'books/edited.book.md', message: 'missing image' }]
	const publication = { jobId, state, diff: pendingChanges() }

	expect(completionReport({ id: 'publish-id', refreshed, failures }, publication)).toEqual({
		diff: null,
		failedPieces: failures
	})
})

test('completion keeps a successful empty failure list authoritative', () => {
	const publication = {
		jobId: 'publish-id',
		state: 'completed',
		diff: pendingChanges(),
		failedPieces: [{ filePath: 'books/edited.book.md', message: 'obsolete failure' }]
	}
	expect(
		completionReport({ id: 'publish-id', refreshed: true, failures: [] }, publication).failedPieces
	).toEqual([])
})

test('ordinary Check selects additions and updates, never schemas or removals', () => {
	const diff = pendingChanges()
	diff.pieces.pruned = ['books/removed.book.md']
	diff.schemas.added = ['books']
	expect(selectablePaths(diff)).toEqual(['books/new.book.md', 'books/edited.book.md'])
	expect(initialSelection(diff, null)).toEqual(selectablePaths(diff))
})

test('single-item Check preselects exactly its pending path', () => {
	const diff = pendingChanges()
	expect(initialSelection(diff, 'books/edited.book.md')).toEqual(['books/edited.book.md'])
	for (const file of ['books/unchanged.book.md', 'books/removed.book.md', '']) {
		expect(initialSelection(diff, file)).toEqual([])
	}
})

test('preselection compares literal filenames without URL decoding or normalization', () => {
	const diff = pendingChanges()
	const file = 'books/源 #?%2F.book.md'
	diff.pieces.added.push(file)
	expect(initialSelection(diff, file)).toEqual([file])
	expect(initialSelection(diff, encodeURIComponent(file))).toEqual([])
})

test('selection toggles are deduplicated and do not mutate previous selections', () => {
	const original = ['books/new.book.md']
	const both = toggleSelection(original, 'books/edited.book.md', true)
	expect(both).toEqual(['books/new.book.md', 'books/edited.book.md'])
	expect(toggleSelection(both, 'books/edited.book.md', true)).toEqual(both)
	expect(toggleSelection(both, 'books/new.book.md', false)).toEqual(['books/edited.book.md'])
	expect(toggleSelection(original, 'books/new.book.md', false)).toEqual([])
	expect(original).toEqual(['books/new.book.md'])
	expect(both).toHaveLength(2)
})

test('duplicate pending paths appear only once in selection', () => {
	const diff = pendingChanges()
	diff.pieces.updated.push(diff.pieces.added[0])
	expect(selectablePaths(diff)).toEqual(['books/new.book.md', 'books/edited.book.md'])
})

test('empty or stale selection cannot silently publish pending additions and updates', () => {
	const diff = pendingChanges()
	expect(canPublishSelection(diff, [])).toBe(false)
	expect(canPublishSelection(diff, ['books/unknown.book.md'])).toBe(false)
	expect(canPublishSelection(diff, ['books/edited.book.md'])).toBe(true)
	expect(initialSelection(diff, null)).toHaveLength(2)
})

test('removals-only publishing stays available with no selected additions or updates', () => {
	const diff = pendingChanges()
	diff.pieces.pruned = ['books/removed.book.md']
	expect(canPublishSelection(diff, [])).toBe(true)
})

test.each(['added', 'updated', 'pruned'] as const)(
	'schema-only %s changes stay publishable without selecting any pieces',
	(kind) => {
		const diff = pendingChanges()
		diff.pieces = { added: [], updated: [], pruned: [] }
		diff.schemas[kind] = ['books']
		expect(initialSelection(diff, null)).toEqual([])
		expect(canPublishSelection(diff, [])).toBe(true)
	}
)

test('up-to-date checks have no publishable work', () => {
	const diff = pendingChanges()
	diff.pieces = { added: [], updated: [], pruned: [] }
	expect(canPublishSelection(diff, [])).toBe(false)
})

test('the actual workflow overrides the action used to attach to an existing run', () => {
	expect(getRunKind('Publish', 'audit')).toBe('publish')
	expect(getRunKind('PublishAudit', 'publish')).toBe('audit')
	expect(getRunKind('Publish', null)).toBe('publish')
})

test('legacy stream frames without workflow metadata retain their existing kind', () => {
	expect(getRunKind(undefined, 'audit')).toBe('audit')
	expect(getRunKind('unknown', 'publish')).toBe('publish')
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

test.each([
	'books/chapter#1.book.md',
	'books/name?query%.book.md',
	'folder with spaces/a book.book.md',
	'books/源 📖.book.md'
])('piece links preserve valid special filename characters: %s', (file) => {
	const encoded = file.split('/').map(encodeURIComponent).join('/')
	expect(editorHref(file)).toBe(`/admin/piece/${encoded}/source`)
	expect(publishedHref(file)).toBe(`/admin/piece/${encoded}/published`)
	for (const href of [editorHref(file), publishedHref(file)]) {
		const url = new URL(href, 'http://localhost')
		expect(url.search).toBe('')
		expect(url.hash).toBe('')
		expect(decodeURIComponent(url.pathname)).toContain(file)
	}
})

function appliedChanges(pieces: Partial<PiecesDiff['pieces']> = {}): PiecesDiff {
	return {
		schemas: { added: [], updated: [], pruned: [] },
		pieces: { added: [], updated: [], pruned: [], ...pieces }
	}
}

test('fresh checks retain only explicitly selected, still-pending upserts without expanding choice', () => {
	const fresh = appliedChanges({
		added: ['new', 'kept', 'kept'],
		updated: ['edited', 'kept'],
		pruned: ['gone']
	})
	const selected = ['edited', 'stale', 'kept', 'edited', 'gone']
	expect(retainSelection(fresh, selected)).toEqual(['edited', 'kept'])
	expect(retainSelection(fresh, [])).toEqual([])
	expect(retainSelection(appliedChanges(), selected)).toEqual([])
	expect(selected).toEqual(['edited', 'stale', 'kept', 'edited', 'gone'])
	expect(fresh.pieces.added).toEqual(['new', 'kept', 'kept'])
})

test('multiple publications accumulate actual outcomes in original insertion order', () => {
	const first = recordPublication(appliedChanges({ added: ['one', 'retry'], pruned: ['gone'] }), [
		{ filePath: 'retry', message: 'bad frontmatter' }
	])
	expect(first).toEqual([
		{ filePath: 'one', state: 'published' },
		{ filePath: 'retry', state: 'failed', message: 'bad frontmatter' },
		{ filePath: 'gone', state: 'removed' }
	])
	const second = recordPublication(appliedChanges({ updated: ['retry', 'two'] }), [], first)
	expect(second).toEqual([
		{ filePath: 'one', state: 'published' },
		{ filePath: 'retry', state: 'published' },
		{ filePath: 'gone', state: 'removed' },
		{ filePath: 'two', state: 'published' }
	])
	expect(second[1]).not.toHaveProperty('message')
	expect(first[1]).toEqual({ filePath: 'retry', state: 'failed', message: 'bad frontmatter' })
})

test('only actual diff upserts become published, never skipped or previously selected targets', () => {
	const previous: PublicationOutcome[] = [
		{ filePath: 'skipped', state: 'failed', message: 'still failed' }
	]
	const outcomes = recordPublication(appliedChanges({ updated: ['confirmed'] }), [], previous)
	expect(outcomes).toEqual([...previous, { filePath: 'confirmed', state: 'published' }])
	expect(recordPublication(null, [], previous)).toEqual(previous)
	expect(recordPublication(null, [])).toEqual([])
})

test('failures outside the applied diff are recorded and latest failures replace messages', () => {
	const previous: PublicationOutcome[] = [
		{ filePath: 'outside', state: 'published' },
		{ filePath: 'retry', state: 'failed', message: 'old error' }
	]
	expect(
		recordPublication(
			null,
			[
				{ filePath: 'outside', message: 'now failed' },
				{ filePath: 'retry', message: 'new error' },
				{ filePath: 'extra', message: '<script> & failure' }
			],
			previous
		)
	).toEqual([
		{ filePath: 'outside', state: 'failed', message: 'now failed' },
		{ filePath: 'retry', state: 'failed', message: 'new error' },
		{ filePath: 'extra', state: 'failed', message: '<script> & failure' }
	])
	expect(previous[0].state).toBe('published')
	expect(previous[1].message).toBe('old error')
})

test('deduplicated removals win conflicting upserts and failures and clear old error messages', () => {
	const diff = appliedChanges({
		added: ['same', 'ok', 'ok'],
		updated: ['same', 'ok'],
		pruned: ['same', 'same']
	})
	expect(
		recordPublication(
			diff,
			[{ filePath: 'same', message: 'error' }],
			[{ filePath: 'same', state: 'failed', message: 'previous error' }]
		)
	).toEqual([
		{ filePath: 'same', state: 'removed' },
		{ filePath: 'ok', state: 'published' }
	])
})

test('global removals and schema-only publications never imply piece success', () => {
	const diff = appliedChanges({ pruned: ['gone'] })
	diff.schemas = { added: ['new-schema'], updated: ['edited-schema'], pruned: ['old-schema'] }
	expect(recordPublication(diff, [])).toEqual([{ filePath: 'gone', state: 'removed' }])
	diff.pieces.pruned = []
	expect(recordPublication(diff, [])).toEqual([])
})

test('provisional pending removes only confirmed healthy upserts and actual removals', () => {
	const pending = appliedChanges({
		added: ['ok', 'failed', 'unselected', 'removed'],
		updated: ['edited', 'failed', 'unconfirmed'],
		pruned: ['removed', 'not-removed', 'ok']
	})
	const applied = appliedChanges({
		added: ['ok', 'failed'],
		updated: ['edited'],
		pruned: ['removed']
	})
	const failures = [
		{ filePath: 'failed', message: 'bad data' },
		{ filePath: 'outside', message: 'missing' }
	]
	const beforePending = structuredClone(pending)
	const beforeApplied = structuredClone(applied)
	expect(pendingAfterPublication(pending, applied, failures)).toEqual(
		appliedChanges({
			added: ['failed', 'unselected'],
			updated: ['failed', 'unconfirmed'],
			pruned: ['not-removed', 'ok']
		})
	)
	expect(pending).toEqual(beforePending)
	expect(applied).toEqual(beforeApplied)
	expect(failures).toHaveLength(2)
})

test('provisional pending applies schema changes only to their matching kind', () => {
	const pending = appliedChanges()
	pending.schemas = {
		added: ['new', 'cross-kind', 'keep-new'],
		updated: ['edit', 'new', 'keep-edit'],
		pruned: ['gone', 'edit', 'keep-gone']
	}
	const applied = appliedChanges()
	applied.schemas = { added: ['new'], updated: ['edit', 'cross-kind'], pruned: ['gone'] }
	const result = pendingAfterPublication(pending, applied, [])
	expect(result?.schemas).toEqual({
		added: ['cross-kind', 'keep-new'],
		updated: ['new', 'keep-edit'],
		pruned: ['edit', 'keep-gone']
	})
	expect(pending.schemas.added).toContain('new')
	expect(result?.schemas).not.toBe(pending.schemas)
})

test('confirmed removal overrides a conflicting failure in provisional pending', () => {
	const pending = appliedChanges({
		added: ['gone', 'keep'],
		updated: ['gone'],
		pruned: ['gone', 'keep']
	})
	const applied = appliedChanges({ added: ['gone'], pruned: ['gone'] })
	expect(
		pendingAfterPublication(pending, applied, [{ filePath: 'gone', message: 'conflict' }])
	).toEqual(appliedChanges({ added: ['keep'], pruned: ['keep'] }))
})

test('unconfirmed completion leaves pending unchanged and null pending stays null', () => {
	const pending = pendingChanges()
	expect(pendingAfterPublication(pending, null, [{ filePath: 'outside', message: 'error' }])).toBe(
		pending
	)
	expect(pendingAfterPublication(null, appliedChanges({ added: ['ok'] }), [])).toBeNull()
	expect(pendingAfterPublication(null, null, [])).toBeNull()
})

function phaseLog(overrides: Partial<PhaseLog> = {}): PhaseLog {
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

test('repeated SSE frames do not create duplicate log or DOM identities', () => {
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
