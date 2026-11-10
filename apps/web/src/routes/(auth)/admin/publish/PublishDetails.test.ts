import type { ComponentProps } from 'svelte'
import { render } from 'svelte/server'
import { expect, test } from 'vitest'
import PublishDetails from './PublishDetails.svelte'
import type { PhaseProgress, PhaseLog } from './report.js'

type Props = ComponentProps<typeof PublishDetails>
const started = Date.parse('2026-01-02T03:04:00Z')

function phase(overrides: Partial<PhaseProgress> = {}): PhaseProgress {
	return {
		phase: 'render',
		status: 'completed',
		started_at: started,
		finished_at: started + 65_000,
		message: 'Rendered successfully',
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

function details(props: Props) {
	return render(PublishDetails, { props }).body
}

function text(html: string) {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}

test('schema changes and step output are visible without opening a disclosure', () => {
	const output = details({
		schemas: { added: ['books'], updated: ['films'], pruned: ['notes'] },
		schemasAlwaysIncluded: true,
		phases: [phase()],
		logs: { render: [log()] }
	})

	expect(output).not.toMatch(/<(?:details|summary)\b/)
	expect(text(output)).toContain('Piece types · always included')
	const entries = [...output.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) =>
		text(match[1])
	)
	expect(entries).toEqual(['New books', 'Updated films', 'Removed notes'])
	expect(text(output)).toContain('Run logs')
	expect(text(output)).toContain('render')
	expect(text(output)).toContain('Rendered successfully')
	expect(text(output)).toContain('Output ready')
})

test('latest phase attempts replace old messages while retaining logs from both jobs', () => {
	const output = details({
		phases: [
			phase({ status: 'failed', message: 'First attempt failed' }),
			phase({ phase: 'assets', message: 'Assets ready' }),
			phase({ message: 'Retry succeeded' })
		],
		logs: {
			render: [
				log({ message: 'First job output' }),
				log({ job_id: 'retry-job', message: 'Retry job output' })
			],
			assets: [log({ phase: 'assets', message: 'Asset output' })]
		}
	})

	const headings = [...output.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map((match) =>
		text(match[1])
	)
	expect(headings).toEqual(['render', 'assets'])
	expect(text(output)).not.toContain('First attempt failed')
	expect(text(output)).toContain('Retry succeeded')
	expect(text(output)).toContain('Assets ready')
	const content = text(output)
	expect(content).toContain('First job output')
	expect(content).toContain('Retry job output')
	expect(content).toContain('Asset output')
	expect(content.indexOf('First job output')).toBeLessThan(content.indexOf('Retry job output'))
	expect(content.indexOf('Retry job output')).toBeLessThan(content.indexOf('Asset output'))
})
