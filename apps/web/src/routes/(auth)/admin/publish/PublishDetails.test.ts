import type { PiecesDiff } from '@luzzle/core'
import type { ComponentProps } from 'svelte'
import { render } from 'svelte/server'
import { expect, test, vi } from 'vitest'
import PublishDetails from './PublishDetails.svelte'
import type { PhaseProgress, PhaseLog } from './report.js'

type Props = ComponentProps<typeof PublishDetails>
const started = Date.parse('2026-01-02T03:04:00Z')

function phase(
	overrides: Partial<PhaseProgress & { job_id: string }> = {}
): PhaseProgress & { job_id: string } {
	return {
		job_id: 'publish-job',
		phase: 'render',
		status: 'completed',
		started_at: started,
		finished_at: started + 65_000,
		message: null,
		...overrides
	}
}

function log(overrides: Partial<PhaseLog> = {}): PhaseLog {
	return {
		job_id: 'publish-job',
		phase: 'render',
		line_number: 1,
		ts: started,
		level: 'stdout',
		message: 'Output ready',
		...overrides
	}
}

function details(props: Props = {}) {
	return render(PublishDetails, { props }).body.replace(/<!--[\s\S]*?-->/g, '')
}

function text(html: string) {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}

function rows(html: string) {
	return [...html.matchAll(/<div\b[^>]*class="log-row\b[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map(
		(match) => match[0]
	)
}

const emptySchemas: PiecesDiff['schemas'] = { added: [], updated: [], pruned: [] }

test('default props have no disclosure or empty-state copy', () => {
	expect(details().trim()).toBe('')
})

test('empty schema lists and no phases omit Details even with the always-included policy', () => {
	for (const schemas of [null, emptySchemas]) {
		expect(details({ schemas, schemasAlwaysIncluded: true, phases: [], logs: {} }).trim()).toBe('')
	}
})

test('orphan logs alone do not invent a phase or a disclosure', () => {
	expect(details({ logs: { render: [log()] } }).trim()).toBe('')
})

test('phase-only Details is a native disclosure, initially closed, with an icon and summary', () => {
	const output = details({ phases: [phase()] })
	const disclosure = output.match(/<details\b[^>]*>/)?.[0]
	expect(disclosure).toBeDefined()
	expect(disclosure).not.toMatch(/\sopen(?:\s|=|>)/)
	expect(output.match(/<details\b/g)).toHaveLength(1)
	const summary = output.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1] ?? ''
	expect(text(summary)).toBe('Details')
	expect(summary).toMatch(/<svg\b/)
	expect(text(output)).toContain('1 stages · 1m 5s')
	expect(text(output)).toContain('render')
	expect(output).not.toMatch(/<(?:section|h2|button)\b/)
})

test('schema-only changes render New, Updated and Removed with separated names', () => {
	const output = details({
		schemas: { added: ['books'], updated: ['films'], pruned: ['notes'] }
	})
	expect(output).toMatch(/<details\b/)
	expect(output).toMatch(/<h2\b[^>]*>Piece types<\/h2>/)
	const entries = [...output.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) =>
		text(match[1])
	)
	expect(entries).toEqual(['New books', 'Updated films', 'Removed notes'])
	expect(text(output)).not.toContain('always included')
	expect(text(output)).not.toContain('stages')
	expect(output).not.toMatch(/<button\b/)
})

test.each(['added', 'updated', 'pruned'] as const)(
	'a lone %s schema makes Details visible without phases',
	(kind) => {
		const output = details({ schemas: { ...emptySchemas, [kind]: ['only-type'] } })
		expect(output).toMatch(/<details\b/)
		expect(output.match(/<li\b/g)).toHaveLength(1)
		expect(text(output)).toContain('only-type')
	}
)

test('always-included policy stays in the schema heading with proper whitespace', () => {
	const output = details({
		schemas: { ...emptySchemas, updated: ['books'] },
		schemasAlwaysIncluded: true,
		phases: [phase()]
	})
	const heading = output.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? ''
	expect(text(heading)).toBe('Piece types · always included')
	expect(output.indexOf('</h2>')).toBeLessThan(output.indexOf('stages'))
	expect(output.match(/<details\b/g)).toHaveLength(1)
})

test('unchanged schemas do not add a heading or policy to phase details', () => {
	const output = details({ schemas: emptySchemas, schemasAlwaysIncluded: true, phases: [phase()] })
	expect(output).not.toMatch(/<h2\b/)
	expect(text(output)).not.toContain('Piece types')
	expect(text(output)).not.toContain('always included')
	expect(text(output)).toContain('1 stages · 1m 5s')
})

test('latest attempts replace earlier phase states without changing first-seen phase order', () => {
	const output = details({
		phases: [
			phase({ status: 'failed', finished_at: started + 10_000, message: 'Old render failure' }),
			phase({
				phase: 'assets',
				started_at: started + 10_000,
				finished_at: started + 20_000,
				message: 'Assets ready'
			}),
			phase({
				job_id: 'retry-job',
				started_at: started + 20_000,
				finished_at: started + 90_000,
				message: 'Retry succeeded'
			})
		]
	})
	const content = text(output)
	expect(content).toContain('2 stages · 1m 30s')
	expect(content).not.toContain('Old render failure')
	expect(content.match(/render/g)).toHaveLength(1)
	expect(content.match(/assets/g)).toHaveLength(1)
	expect(content.indexOf('render')).toBeLessThan(content.indexOf('assets'))
	expect(content).toContain('Retry succeeded')
	expect(content).toContain('Assets ready')
})

test.each([
	{ finished: started + 59_999, duration: '59s' },
	{ finished: started + 60_000, duration: '1m 0s' },
	{ finished: started - 1000, duration: '0s' }
])('metadata formats total duration as $duration', ({ finished, duration }) => {
	expect(text(details({ phases: [phase({ finished_at: finished })] }))).toContain(
		`1 stages · ${duration}`
	)
})

test('missing start time yields zero elapsed duration', () => {
	expect(text(details({ phases: [phase({ started_at: 0 })] }))).toContain('1 stages · 0s')
})

test('unfinished phase duration uses the current time when rendered', () => {
	const now = vi.spyOn(Date, 'now').mockReturnValue(started + 125_000)
	try {
		expect(text(details({ phases: [phase({ status: 'running', finished_at: null })] }))).toContain(
			'1 stages · 2m 5s'
		)
	} finally {
		now.mockRestore()
	}
})

test.each(['completed', 'running', 'failed', 'skipped', 'waiting', 'future-state'])(
	'phase status %s preserves its message and known-status icon',
	(status) => {
		const output = details({ phases: [phase({ status, message: `Message for ${status}` })] })
		expect(text(output)).toContain(`Message for ${status}`)
		// The summary always has a caret; known phase statuses add their own icon.
		const known = ['completed', 'running', 'failed', 'skipped'].includes(status)
		expect(output.match(/<svg\b/g)).toHaveLength(known ? 2 : 1)
	}
)

test('logs render UTC timestamps, line counts, error emphasis and a native locked button', () => {
	const output = details({
		phases: [phase()],
		logs: {
			render: [
				log(),
				log({ line_number: 2, ts: started + 1000, level: 'error', message: 'Error detail' }),
				log({ line_number: 3, ts: started + 2000, level: 'stderr', message: 'Stderr detail' }),
				log({ line_number: 4, ts: started + 3000, level: 'info', message: 'Info detail' })
			]
		}
	})
	const content = text(output)
	for (const expected of [
		'4 lines',
		'03:04:00',
		'03:04:01',
		'03:04:02',
		'03:04:03',
		'Output ready',
		'Error detail',
		'Stderr detail',
		'Info detail'
	])
		expect(content).toContain(expected)
	const button = output.match(/<button\b([^>]*)>([\s\S]*?)<\/button>/)
	expect(button).not.toBeNull()
	expect(button?.[1]).toContain('type="button"')
	expect(button?.[1]).toContain('title="Auto-scroll locked"')
	expect(button?.[1]).toContain('aria-pressed="true"')
	expect(button?.[2]).toMatch(/<svg\b/)
	const renderedRows = rows(output)
	expect(renderedRows).toHaveLength(4)
	expect(renderedRows[0]).not.toContain('is-error')
	expect(renderedRows[1]).toContain('is-error')
	expect(renderedRows[2]).toContain('is-error')
	expect(renderedRows[3]).not.toContain('is-error')
})

test('logless phases do not invent consoles, buttons, or line-count copy', () => {
	const output = details({ phases: [phase(), phase({ phase: 'assets' })], logs: { render: [] } })
	expect(text(output)).toContain('2 stages')
	expect(text(output)).not.toContain('lines')
	expect(output).not.toMatch(/<button\b/)
})

test('equal line numbers from different jobs and phases remain distinct in their supplied order', () => {
	const output = details({
		phases: [phase(), phase({ phase: 'assets' })],
		logs: {
			render: [
				log({ job_id: 'job:1', message: 'First job line one' }),
				log({ job_id: 'job:2', message: 'Retry job line one' }),
				log({ job_id: 'job:2', line_number: 2, message: 'Retry job line two' })
			],
			assets: [log({ job_id: 'job:1', phase: 'assets', message: 'Assets line one' })],
			orphan: [log({ phase: 'orphan', message: 'Not a visible phase' })]
		}
	})
	const content = text(output)
	expect(rows(output)).toHaveLength(4)
	expect(content).toContain('3 lines')
	expect(content).toContain('1 lines')
	const messages = [
		'First job line one',
		'Retry job line one',
		'Retry job line two',
		'Assets line one'
	]
	for (const message of messages) expect(content.split(message)).toHaveLength(2)
	for (let index = 1; index < messages.length; index++) {
		expect(content.indexOf(messages[index - 1])).toBeLessThan(content.indexOf(messages[index]))
	}
	expect(content).not.toContain('Not a visible phase')
	expect(output.match(/<button\b/g)).toHaveLength(2)
})

test('schema names, phase names, status messages and log messages remain escaped data', () => {
	const unsafe = '<script>not executable & still visible</script>'
	const phaseName = '<img src=x> & phase'
	const output = details({
		schemas: { added: [unsafe], updated: [], pruned: [] },
		phases: [phase({ phase: phaseName, status: 'failed', message: unsafe })],
		logs: { [phaseName]: [log({ phase: phaseName, level: 'error', message: unsafe })] }
	})
	expect(output).not.toMatch(/<(?:script|img)\b/)
	expect(output.match(/&lt;script>not executable &amp; still visible&lt;\/script>/g)).toHaveLength(
		3
	)
	expect(output).toContain('&lt;img src=x> &amp; phase')
})

test('readonly parent arrays and DTO extra properties are accepted without input mutation', () => {
	const phases = Object.freeze([Object.freeze(phase({ job_id: 'parent-job' }))])
	const renderLogs = Object.freeze([Object.freeze(log({ job_id: 'parent-job' }))])
	const logs = Object.freeze({ render: renderLogs })
	const output = details({ phases, logs })
	expect(text(output)).toContain('Output ready')
	expect(phases[0].job_id).toBe('parent-job')
	expect(logs.render).toBe(renderLogs)
})

// SSR covers rendering and initial controls, not DOM identity across client updates
// or browser scrolling. Manually review disclosure/keyboard toggles, opening after
// completion, locked appends, manual unlock/relock, button-off position preservation,
// independent phases/instances, and viewport cleanup when logs or Details disappear.
