import type { PiecesDiff } from '@luzzle/core'
import { render } from 'svelte/server'
import { expect, test } from 'vitest'
import PublishTable from './PublishTable.svelte'
import type { PublicationOutcome } from './report.js'

const added = 'books/源 #?%.books.md'
const updated = 'films/a saved change.films.md'
const removed = 'books/gone.books.md'

function diff(pieces: Partial<PiecesDiff['pieces']> = {}): PiecesDiff {
	return {
		schemas: { added: [], updated: [], pruned: [] },
		pieces: { added: [added], updated: [updated], pruned: [removed], ...pieces }
	}
}

type TableProps = {
	diff?: PiecesDiff | null
	outcomes?: PublicationOutcome[]
	order?: string[]
	selectedPaths?: string[]
	publishingPaths?: string[]
	disabled?: boolean
}

function table(props: TableProps = {}) {
	return render(PublishTable, { props }).body.replace(/<!--[\s\S]*?-->/g, '')
}

function html(changes = diff(), selectedPaths?: string[]) {
	return render(PublishTable, {
		props: { diff: changes, ...(selectedPaths === undefined ? {} : { selectedPaths }) }
	}).body.replace(/<!--[\s\S]*?-->/g, '')
}

function labels(output: string): string[] {
	return [...output.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].map((match) => match[1])
}

function labelFor(output: string, text: string): string {
	const label = labels(output).find((label) => label.includes(text))
	if (!label) throw new Error(`Missing checkbox label: ${text}`)
	return label
}

function checkbox(label: string): string {
	const input = label.match(/<input\b[^>]*>/)?.[0]
	if (!input) throw new Error('Missing native checkbox')
	expect(input).toContain('type="checkbox"')
	return input
}

function section(output: string, name: string): string {
	const match = [...output.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)].find((match) =>
		match[1].includes(`aria-label="${name}"`)
	)
	if (!match) throw new Error(`Missing section: ${name}`)
	return match[2]
}

const checkedAttribute = /\schecked(?:\s|=|\/?>)/

test('one pending list contains New and Updated rows with filenames inside native checkbox labels', () => {
	const output = html()
	const pending = section(output, 'Pieces')
	expect(pending.match(/<ul\b/g)).toHaveLength(1)
	expect(pending.match(/<li\b/g)).toHaveLength(2)

	for (const [file, badge] of [
		[added, 'New'],
		[updated, 'Updated']
	]) {
		const label = labelFor(pending, file)
		checkbox(label)
		expect(label).toContain(file)
		expect(label).toMatch(new RegExp(`>\\s*${badge}\\s*</span>`))
		expect(label).not.toMatch(/<a\b/)
	}
})

test('each Edit link is separate from the selection label and has an encoded editor URL', () => {
	const pending = section(html(), 'Pieces')
	const row = [...pending.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].find((match) =>
		match[1].includes(added)
	)?.[1]
	if (!row) throw new Error('Missing added row')
	const link = row.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/)
	if (!link) throw new Error('Missing Edit link')
	expect(link[1]).toContain('href="/admin/piece/books/%E6%BA%90%20%23%3F%25.books.md/source"')
	expect(link[1]).toContain(`aria-label="Edit ${added}"`)
	expect(link[1]).toContain(`title="Edit ${added}"`)
	expect(link[1]).not.toMatch(/\btarget\s*=/)
	expect(link[2]).toMatch(/<svg\b/)
	expect(link[2].replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/g, '').trim()).toBe('')
	expect(row.indexOf('</label>')).toBeLessThan(row.indexOf('<a '))
	expect(pending.match(/<a\b/g)).toHaveLength(2)
})

test('master selection is a single native checkbox rather than separate all and none actions', () => {
	const output = html()
	checkbox(labelFor(output, 'Select all'))
	expect(labels(output).filter((label) => label.includes('Select all'))).toHaveLength(1)
	expect(output).not.toContain('Select none')
	expect(output).not.toMatch(/<button\b/)
})

test.each([
	{ state: 'none', selection: [], checkedFiles: [], masterChecked: false },
	{ state: 'some', selection: [added], checkedFiles: [added], masterChecked: false },
	{
		state: 'all',
		selection: [added, updated],
		checkedFiles: [added, updated],
		masterChecked: true
	}
])('renders checkbox state with $state selected', ({ selection, checkedFiles, masterChecked }) => {
	const output = html(diff(), selection)
	for (const file of [added, updated]) {
		const input = checkbox(labelFor(output, file))
		expect(checkedAttribute.test(input)).toBe(checkedFiles.includes(file))
	}
	expect(checkedAttribute.test(checkbox(labelFor(output, 'Select all')))).toBe(masterChecked)
})

test('omitting the bindable selection starts with unchecked pending pieces', () => {
	const output = html()
	for (const label of labels(output)) {
		expect(checkbox(label)).not.toMatch(checkedAttribute)
	}
})

test('master state counts only distinct pending paths, not removals or stale selections', () => {
	const output = html(diff({ added: [added, added], updated: [updated, added] }), [
		added,
		added,
		updated,
		removed,
		'stale.books.md'
	])
	expect(checkbox(labelFor(output, 'Select all'))).toMatch(checkedAttribute)
	expect(section(output, 'Pieces').match(/<li\b/g)).toHaveLength(2)
})

test('removals stay visible beneath pending pieces as plain, unselectable filenames', () => {
	const output = html(diff(), [removed])
	const removals = section(output, 'Removals')
	expect(removals).toContain('Removals · always included')
	expect(removals).toContain(removed)
	expect(removals.match(/<li\b/g)).toHaveLength(1)
	expect(removals).not.toMatch(/<(?:input|label|a|button)\b/)
	expect(output.indexOf('aria-label="Pieces"')).toBeLessThan(
		output.indexOf('aria-label="Removals"')
	)
	expect(output).not.toContain(`/admin/piece/${removed}/`)
})

test('removal-only changes have no master checkbox or pending selection list', () => {
	const output = html(diff({ added: [], updated: [] }))
	expect(section(output, 'Removals')).toContain(removed)
	expect(output).not.toContain('aria-label="Pieces"')
	expect(output).not.toContain('Select all')
	expect(output).not.toMatch(/<(?:input|label|a)\b/)
	expect(output).not.toContain('No piece changes.')
})

test('upsert-only changes omit the removals section', () => {
	const output = html(diff({ pruned: [] }))
	expect(section(output, 'Pieces')).toContain(added)
	expect(output).not.toContain('aria-label="Removals"')
	expect(output).not.toContain('Removals · always included')
})

test('no piece changes shows a short empty state without schema rows or selection controls', () => {
	const changes = diff({ added: [], updated: [], pruned: [] })
	changes.schemas = {
		added: ['new-schema'],
		updated: ['updated-schema'],
		pruned: ['removed-schema']
	}
	const output = html(changes)
	expect(output).toContain('No piece changes.')
	expect(output).not.toMatch(/<(?:section|ul|input|label|a)\b/)
	for (const name of Object.values(changes.schemas).flat()) {
		expect(output).not.toContain(name)
	}
})

test('filenames in every change kind are escaped rather than rendered as markup', () => {
	const unsafe = '<img src=x onerror="alert(1)"> & notes.books.md'
	const output = html(
		diff({ added: [unsafe], updated: [`updated/${unsafe}`], pruned: [`removed/${unsafe}`] })
	)
	expect(output).not.toMatch(/<img\b/)
	expect(output).toContain('&lt;img')
	expect(output).toContain('&amp; notes.books.md')
	expect(section(output, 'Removals')).toContain('removed/&lt;img')
	expect(output).toContain(
		'href="/admin/piece/%3Cimg%20src%3Dx%20onerror%3D%22alert(1)%22%3E%20%26%20notes.books.md/source"'
	)
})

function rowFor(output: string, file: string): string {
	const row = [...output.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].find((match) =>
		match[1].includes(file)
	)
	if (!row) throw new Error(`Missing row: ${file}`)
	return row[1]
}

const disabledAttribute = /\sdisabled(?:\s|=|\/?>)/

test('default props render an empty state', () => {
	const output = table()
	expect(output).toContain('No piece changes.')
	expect(output).not.toMatch(/<(?:section|ul|input|label|a)\b/)
})

test('pending, failed, and confirmed rows share one list with only pending rows selectable', () => {
	const failed = 'failed.books.md'
	const published = 'published.books.md'
	const outside = 'outside.books.md'
	const output = table({
		diff: diff({ added: [added, failed], updated: [updated], pruned: [] }),
		outcomes: [
			{ filePath: failed, state: 'failed', message: 'Invalid date' },
			{ filePath: published, state: 'published' },
			{ filePath: outside, state: 'failed', message: 'Not found' }
		],
		selectedPaths: [added, failed]
	})
	const pieces = section(output, 'Pieces')
	expect(pieces.match(/<ul\b/g)).toHaveLength(1)
	expect(pieces.match(/<li\b/g)).toHaveLength(5)
	for (const file of [added, updated, failed]) checkbox(labelFor(output, file))
	const retry = rowFor(output, failed)
	expect(retry).toContain('Failed')
	expect(retry).toContain('Invalid date')
	expect(checkbox(labelFor(output, failed))).toMatch(checkedAttribute)
	const readOnly = rowFor(output, outside)
	expect(readOnly).toContain('Failed')
	expect(readOnly).toContain('Not found')
	expect(readOnly).not.toMatch(/<(?:input|label)\b/)
	expect(readOnly).toContain('aria-label="Edit outside.books.md"')
	expect(rowFor(output, published)).not.toMatch(/<(?:input|label)\b/)
})

test('confirmed publication replaces the checkbox with a check icon and a linked Published status', () => {
	const output = table({ outcomes: [{ filePath: added, state: 'published' }] })
	const pieces = section(output, 'Pieces')
	expect(pieces).toMatch(/<h3\b[^>]*>Pieces<\/h3>/)
	expect(pieces).not.toContain('Select all')
	expect(pieces).not.toMatch(/<(?:input|label)\b/)
	const row = rowFor(pieces, added)
	const links = [...row.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
	expect(links).toHaveLength(2)
	expect(links[0][1]).toContain(
		'href="/admin/piece/books/%E6%BA%90%20%23%3F%25.books.md/published"'
	)
	expect(links[0][2].trim()).toBe('Published')
	expect(links[1][1]).toContain(`aria-label="Edit ${added}"`)
	expect(row.match(/<svg\b/g)).toHaveLength(2)
	expect(row).toContain(`>${added}</span>`)
	for (const link of links) {
		expect(link[2]).not.toContain(added)
		expect(link[1]).not.toMatch(/\b(?:target|disabled|aria-disabled)\s*=/)
	}
})

test('fresh pending data takes precedence over prior published and removed outcomes', () => {
	const output = table({
		diff: diff({ pruned: [] }),
		outcomes: [
			{ filePath: added, state: 'published' },
			{ filePath: updated, state: 'removed' }
		]
	})
	const pieces = section(output, 'Pieces')
	expect(pieces.match(/<li\b/g)).toHaveLength(2)
	for (const [file, status] of [
		[added, 'New'],
		[updated, 'Updated']
	]) {
		const label = labelFor(output, file)
		expect(checkbox(label)).not.toMatch(checkedAttribute)
		expect(label).toContain(status)
		expect(label).not.toContain('Published')
	}
	expect(output).not.toContain('aria-label="Removals"')
	expect(output).not.toContain('/published"')
})

test('fresh pending removals replace prior outcomes and keep the always-included policy', () => {
	const output = table({
		diff: diff({ added: [], updated: [], pruned: [removed, removed] }),
		outcomes: [
			{ filePath: removed, state: 'failed', message: 'obsolete failure' },
			{ filePath: 'other.books.md', state: 'removed' }
		]
	})
	const removals = section(output, 'Removals')
	expect(removals).toContain('Removals · always included')
	expect(removals.match(/<li\b/g)).toHaveLength(2)
	expect(output).not.toContain('obsolete failure')
	expect(output).not.toContain('aria-label="Pieces"')
	expect(removals).not.toMatch(/<(?:input|label|a|button|svg)\b/)
	const rows = [...removals.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1])
	const pending = rows.find((row) => row.includes(removed))
	const completed = rows.find((row) => row.includes('other.books.md'))
	expect(pending).toBeDefined()
	expect(completed).toBeDefined()
	expect(pending).not.toMatch(/<span\b[^>]*>\s*Removed\s*<\/span>/)
	expect(completed).toMatch(/<span\b[^>]*>\s*Removed\s*<\/span>/)
})

test('confirmed removals use the same plain removal list without the pending policy', () => {
	const output = table({
		outcomes: [
			{ filePath: removed, state: 'removed' },
			{ filePath: removed, state: 'removed' }
		]
	})
	const removals = section(output, 'Removals')
	expect(removals).toMatch(/<h3\b[^>]*>Removals<\/h3>/)
	expect(removals).not.toContain('always included')
	expect(removals.match(/<li\b/g)).toHaveLength(1)
	expect(removals).not.toMatch(/<(?:input|label|a|button|svg)\b/)
})

test('disabled locks all selection controls but keeps native completed and Edit links available', () => {
	const completed = 'complete.books.md'
	const output = table({
		diff: diff({ pruned: [] }),
		disabled: true,
		outcomes: [{ filePath: completed, state: 'published' }]
	})
	for (const label of labels(output)) expect(checkbox(label)).toMatch(disabledAttribute)
	const links = [...output.matchAll(/<a\b([^>]*)>/g)]
	expect(links).toHaveLength(4)
	for (const link of links) {
		expect(link[1]).toContain('href=')
		expect(link[1]).not.toMatch(/\b(?:disabled|aria-disabled|tabindex)\s*=/)
	}
	expect(rowFor(output, completed)).toContain('Published')
})

test('publishing paths show a locked Publishing row instead of prior failure or success', () => {
	const output = table({
		diff: diff({ pruned: [] }),
		selectedPaths: [added],
		publishingPaths: [added],
		outcomes: [{ filePath: added, state: 'failed', message: 'old error' }]
	})
	const row = rowFor(output, added)
	expect(row).toContain('Publishing')
	expect(row).not.toContain('Failed')
	expect(row).not.toContain('old error')
	expect(checkbox(labelFor(output, added))).toMatch(disabledAttribute)
	expect(checkbox(labelFor(output, added))).toMatch(checkedAttribute)
	expect(checkbox(labelFor(output, 'Select all'))).toMatch(disabledAttribute)
	expect(checkbox(labelFor(output, updated))).not.toMatch(disabledAttribute)
	expect(row).toContain(`aria-label="Edit ${added}"`)
})

test('completed records never affect master selection counts and duplicate outcomes make one row', () => {
	const output = table({
		diff: diff({ pruned: [] }),
		outcomes: [
			{ filePath: 'done.books.md', state: 'failed', message: 'old error' },
			{ filePath: 'done.books.md', state: 'published' }
		],
		selectedPaths: [added, updated, removed, 'done.books.md', 'stale.books.md']
	})
	expect(checkbox(labelFor(output, 'Select all'))).toMatch(checkedAttribute)
	expect(section(output, 'Pieces').match(/<li\b/g)).toHaveLength(3)
	expect(rowFor(output, 'done.books.md')).toContain('Published')
	expect(output).not.toContain('old error')
})

test('failed-only completed lists have a Pieces header and a separate editor action', () => {
	const output = table({
		outcomes: [{ filePath: added, state: 'failed', message: 'Cannot parse YAML' }]
	})
	const pieces = section(output, 'Pieces')
	expect(pieces).toMatch(/<h3\b[^>]*>Pieces<\/h3>/)
	expect(pieces).toContain('Failed')
	expect(pieces).toContain('Cannot parse YAML')
	expect(pieces).not.toMatch(/<(?:input|label)\b/)
	expect(pieces).not.toContain('Select all')
	expect(pieces).not.toContain('/published"')
	expect(pieces.match(/<a\b/g)).toHaveLength(1)
	expect(pieces).toContain(`aria-label="Edit ${added}"`)
})

test('untrusted outcome filenames and failure messages render as escaped text', () => {
	const unsafe = '<img src=x onerror="alert(1)"> & notes.books.md'
	const message = '<script>alert("bad")</script> & invalid'
	const output = table({
		outcomes: [
			{ filePath: unsafe, state: 'published' },
			{ filePath: `failed/${unsafe}`, state: 'failed', message },
			{ filePath: `removed/${unsafe}`, state: 'removed' }
		]
	})
	expect(output).not.toMatch(/<(?:img|script)\b/)
	expect(output).toContain('&lt;img')
	expect(output).toContain('&amp; notes.books.md')
	expect(output).toContain('&lt;script')
	expect(output).toContain('&amp; invalid')
	expect(output).toContain(
		'/%3Cimg%20src%3Dx%20onerror%3D%22alert(1)%22%3E%20%26%20notes.books.md/published'
	)
	expect(section(output, 'Removals')).not.toMatch(/<a\b/)
})

test('parent order keeps completed B between pending A and C after provisional filtering', () => {
	const a = 'A.books.md'
	const b = 'B.books.md'
	const c = 'C.books.md'
	const order = [a, b, c]
	const before = table({
		diff: diff({ added: [a, b, c], updated: [], pruned: [] }),
		order,
		publishingPaths: [b]
	})
	const after = table({
		diff: diff({ added: [a, c], updated: [], pruned: [] }),
		outcomes: [{ filePath: b, state: 'published' }],
		order
	})
	for (const output of [before, after]) {
		const pieces = section(output, 'Pieces')
		expect(pieces.match(/<li\b/g)).toHaveLength(3)
		expect(pieces.indexOf(a)).toBeLessThan(pieces.indexOf(b))
		expect(pieces.indexOf(b)).toBeLessThan(pieces.indexOf(c))
	}
	expect(rowFor(before, b)).toContain('Publishing')
	expect(rowFor(after, b)).toContain('Published')
	expect(rowFor(after, b)).not.toMatch(/<input\b/)
})

test('order deduplicates current rows, drops stale or removed paths, and appends new membership', () => {
	const output = table({
		diff: diff({ added: [added, updated, added], updated: [], pruned: [removed] }),
		outcomes: [
			{ filePath: 'done.books.md', state: 'published' },
			{ filePath: 'failed.books.md', state: 'failed', message: 'Invalid date' },
			{ filePath: removed, state: 'published' }
		],
		order: [updated, 'stale.books.md', updated, removed, added]
	})
	const pieces = section(output, 'Pieces')
	expect(pieces.match(/<li\b/g)).toHaveLength(4)
	const expected = [updated, added, 'done.books.md', 'failed.books.md']
	for (let index = 1; index < expected.length; index++) {
		expect(pieces.indexOf(expected[index - 1])).toBeLessThan(pieces.indexOf(expected[index]))
	}
	expect(pieces).not.toContain('stale.books.md')
	expect(pieces).not.toContain(removed)
	expect(section(output, 'Removals')).toContain(removed)
})

test('pending removals win over overlapping upserts, outcomes, order, and selection', () => {
	const output = table({
		diff: diff({ added: [added, removed], updated: [removed], pruned: [removed, removed] }),
		outcomes: [{ filePath: removed, state: 'failed', message: 'superseded failure' }],
		order: [removed, added, removed],
		selectedPaths: [added, removed]
	})
	const pieces = section(output, 'Pieces')
	expect(pieces.match(/<li\b/g)).toHaveLength(1)
	expect(pieces).not.toContain(removed)
	expect(checkbox(labelFor(output, added))).toMatch(checkedAttribute)
	expect(checkbox(labelFor(output, 'Select all'))).toMatch(checkedAttribute)
	const removals = section(output, 'Removals')
	expect(removals.match(/<li\b/g)).toHaveLength(1)
	expect(removals).toContain(removed)
	expect(removals).toContain('always included')
	expect(removals).not.toMatch(/<(?:input|label|a)\b/)
	expect(output).not.toContain('superseded failure')
})

test('latest outcomes decide piece versus removal membership without duplicate rows or old errors', () => {
	const output = table({
		outcomes: [
			{ filePath: removed, state: 'published' },
			{ filePath: added, state: 'removed' },
			{ filePath: removed, state: 'failed', message: 'old failure' },
			{ filePath: removed, state: 'removed' },
			{ filePath: added, state: 'published' }
		],
		order: [removed, added, removed, added]
	})
	const pieces = section(output, 'Pieces')
	expect(pieces.match(/<li\b/g)).toHaveLength(1)
	expect(pieces).toContain(added)
	expect(pieces).not.toContain(removed)
	expect(rowFor(pieces, added)).toContain('/published"')
	const removals = section(output, 'Removals')
	expect(removals.match(/<li\b/g)).toHaveLength(1)
	expect(removals).toContain(removed)
	expect(removals).not.toContain(added)
	expect(removals).not.toContain('always included')
	expect(output).not.toContain('old failure')
})

test('partial results keep skipped pending targets unchecked rather than inferring publication', () => {
	const done = 'done.books.md'
	const retry = 'retry.books.md'
	const skipped = 'skipped.books.md'
	const output = table({
		diff: diff({ added: [retry, skipped], updated: [], pruned: [] }),
		outcomes: [
			{ filePath: done, state: 'published' },
			{ filePath: retry, state: 'failed', message: 'Retry this item' }
		],
		order: [done, retry, skipped, 'unknown.books.md'],
		selectedPaths: [retry]
	})
	const pieces = section(output, 'Pieces')
	expect(pieces.match(/<li\b/g)).toHaveLength(3)
	expect(pieces).not.toContain('unknown.books.md')
	expect(pieces.indexOf(done)).toBeLessThan(pieces.indexOf(retry))
	expect(pieces.indexOf(retry)).toBeLessThan(pieces.indexOf(skipped))
	expect(rowFor(output, done)).toContain('/published"')
	expect(rowFor(output, done)).not.toMatch(/<(?:input|label)\b/)
	expect(checkbox(labelFor(output, retry))).toMatch(checkedAttribute)
	expect(labelFor(output, retry)).toContain('Failed')
	expect(labelFor(output, retry)).toContain('Retry this item')
	expect(checkbox(labelFor(output, skipped))).not.toMatch(checkedAttribute)
	expect(labelFor(output, skipped)).toContain('New')
	expect(rowFor(output, skipped)).not.toContain('/published"')
	expect(checkbox(labelFor(output, 'Select all'))).not.toMatch(checkedAttribute)
})

// SSR exercises rendering only. Owner review still needs to cover label/keyboard toggles,
// parent binding updates, master indeterminate state, and independent native link navigation.
