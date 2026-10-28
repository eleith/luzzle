import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import Page from './+page.svelte'
import type { RunView } from './+page.server.js'

const location = vi.hoisted(() => ({ url: 'http://localhost/admin/publish' }))

vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }))
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return new URL(location.url)
		}
	}
}))

// SSR fixtures do not exercise native clicks, onMount checks, or streamed transitions.
function html({
	failedPieces = [{ filePath: 'failed.book.md', message: 'missing attachment' }],
	phases = [],
	pieces = {
		added: ['failed.book.md', 'healthy.book.md'],
		updated: [],
		pruned: []
	},
	publish = true,
	state = 'completed',
	schemas = { added: [], updated: [], pruned: [] },
	logs = [],
	audit = null
}: {
	failedPieces?: RunView['failedPieces']
	phases?: RunView['phases']
	pieces?: NonNullable<RunView['diff']>['pieces']
	publish?: boolean
	state?: RunView['state']
	schemas?: NonNullable<RunView['diff']>['schemas']
	logs?: RunView['logs']
	audit?: RunView | null
} = {}) {
	const publication: RunView | null = publish
		? {
				jobId: 'publish-id',
				state,
				errors: null,
				phases,
				logs,
				failedPieces,
				diff: { schemas, pieces }
			}
		: null
	const data = {
		pieceTypes: ['books'],
		meta: { title: 'Publish' },
		config: {
			url: { app: 'http://localhost', app_assets: '', luzzle_assets: '' },
			content: { text: { title: 'Test', description: '' } }
		},
		audit,
		publish: publication
	}
	return render(Page, { props: { data } as ComponentProps<typeof Page> }).body
}

function withoutComments(output: string) {
	return output.replace(/<!--[\s\S]*?-->/g, '')
}

function text(output: string) {
	return withoutComments(output)
		.replace(/<(?:"[^"]*"|'[^']*'|[^'">])*>/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#(?:39|x27);/g, "'")
		.replace(/&amp;/g, '&')
}

function buttons(output: string) {
	return [...withoutComments(output).matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
}

function links(output: string) {
	return [...withoutComments(output).matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/a>/g)]
}

function region(output: string, label: string) {
	const matches = [
		...withoutComments(output).matchAll(
			/<section\b[^>]*\baria-label="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g
		)
	].filter((section) => section[1] === label)
	expect(matches, `one ${label} region`).toHaveLength(1)
	return matches[0][2]
}

function pieceRow(output: string, file: string) {
	const rows = [...region(output, 'Pieces').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].filter(
		(row) => text(row[1]).includes(file)
	)
	expect(rows, `one row for ${file}`).toHaveLength(1)
	return rows[0][1]
}

function expectEditLink(output: string, file: string, href: string) {
	const editors = links(output).filter((link) => link[1].includes(`href="${href}"`))
	expect(editors).toHaveLength(1)
	expect(editors[0][1]).toContain(`aria-label="Edit ${file}"`)
	expect(text(editors[0][2]).trim()).toBe('')
	expect(editors[0][2]).toMatch(/<svg\b/)
}

function disclosure(output: string, summary: string) {
	const details = [...withoutComments(output).matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)]
	const match = details.find((item) => {
		const label = item[2].match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1]
		return label !== undefined && text(label).trim() === summary
	})
	expect(match, `native ${summary} disclosure`).toBeDefined()
	expect(match![1]).not.toMatch(/\bopen(?:\s|=|$)/)
	return match![2]
}

function expectHeaderChecksOnly(output: string) {
	expect(buttons(output).map((button) => text(button[2]).trim())).toEqual(['Check', 'Sync & Check'])
	expect(withoutComments(output)).not.toMatch(/<footer\b/)
}

function audit(state: RunView['state'], diff: RunView['diff'] = null): RunView {
	return {
		jobId: 'audit-id',
		state,
		errors: null,
		phases: [],
		logs: [],
		failedPieces: [],
		diff
	}
}

function expectChecking(output: string) {
	const markup = withoutComments(output)
	expect(markup.match(/<h1\b[^>]*>/g)).toHaveLength(1)
	expect(markup).toMatch(/<h1\b[^>]*>\s*Publish\s*<\/h1>/)
	expect(text(output).match(/Checking changes…/g)).toHaveLength(1)
	expect(output.match(/role="(?:alert|status)"/g)).toHaveLength(1)
	expectHeaderChecksOnly(output)
	expect(text(output)).toContain('Sync & Check')
	expect(output).not.toContain('Check item first')
	expect(output).not.toContain('Publish all')
	expect(output).not.toContain('Publish changes')
}

test('a completed partial publish stays visible after reload without duplicate results or success claims', () => {
	const output = html()
	const content = text(output)
	expect(content.match(/Published with errors/g)).toHaveLength(1)
	expect(output.match(/role="(?:alert|status)"/g)).toHaveLength(1)
	expect(output).toContain('role="alert"')
	expect(output).not.toContain('Checking changes…')
	expect(content.match(/missing attachment/g)).toHaveLength(1)
	expect(content.match(/failed\.book\.md/g)).toHaveLength(1)
	expect(content.match(/healthy\.book\.md/g)).toHaveLength(1)
	expect(output).not.toContain('asset generation failed')
	expect(output).not.toContain('Asset generation failed')
	const failed = pieceRow(output, 'failed.book.md')
	expect(text(failed)).toContain('Failed')
	expect(text(failed)).toContain('missing attachment')
	expect(text(failed)).not.toContain('Published')
	expectEditLink(failed, 'failed.book.md', '/admin/piece/failed.book.md/source')
	expect(output).not.toContain('/admin/piece/failed.book.md/published')
	const healthy = pieceRow(output, 'healthy.book.md')
	expectEditLink(healthy, 'healthy.book.md', '/admin/piece/healthy.book.md/source')
	const published = links(healthy).filter((link) => text(link[2]).trim() === 'Published')
	expect(published).toHaveLength(1)
	expect(published[0][1]).toContain('href="/admin/piece/healthy.book.md/published"')
	expect(links(output).some((link) => /(?:failed|healthy)\.book\.md/.test(text(link[2])))).toBe(
		false
	)
	expectHeaderChecksOnly(output)
	expect(output).not.toContain('/live')
	expect(output).not.toContain('Published successfully')
})

test('failures outside the diff remain visible once with encoded editor links', () => {
	const file = 'books/chapter#1?%.book.md'
	const output = html({ failedPieces: [{ filePath: file, message: 'missing image' }] })
	expectEditLink(
		pieceRow(output, file),
		file,
		'/admin/piece/books/chapter%231%3F%25.book.md/source'
	)
	expect(output).not.toContain('/admin/piece/books/chapter%231%3F%25.book.md/published')
	expect(text(output).split(file)).toHaveLength(2)
	expect(text(output).match(/missing image/g)).toHaveLength(1)
})

test.each(['added', 'updated'] as const)(
	'healthy %s pieces open the encoded Published overview in the same tab',
	(kind) => {
		const file = 'books/源 #?%.book.md'
		const output = html({ pieces: { added: [], updated: [], pruned: [], [kind]: [file] } })
		const href = '/admin/piece/books/%E6%BA%90%20%23%3F%25.book.md/published'
		const row = pieceRow(output, file)
		const published = links(row).filter((link) => link[1].includes(`href="${href}"`))
		expect(published).toHaveLength(1)
		expect(text(published[0][2]).trim()).toBe('Published')
		expect(published[0][1]).not.toMatch(/\btarget\s*=/)
		expectEditLink(row, file, '/admin/piece/books/%E6%BA%90%20%23%3F%25.book.md/source')
		expect(links(row).some((link) => text(link[2]).includes(file))).toBe(false)
		expect(text(output).split(file)).toHaveLength(2)
		expect(output).not.toContain('/live')
	}
)

test('pruned pieces remain plain text instead of linking to Published or source', () => {
	const file = 'gone.book.md'
	const output = html({ pieces: { added: [], updated: [], pruned: [file] } })
	const removals = region(output, 'Removals')
	expect(removals).toMatch(/<span\b[^>]*>gone\.book\.md<\/span>/)
	expect(links(removals)).toHaveLength(0)
	expect(text(output).split(file)).toHaveLength(2)
	expect(output).not.toContain(`/admin/piece/${file}/`)
})

test('partial reports retain one timeline row for the latest attempt and count stages inside collapsed Details', () => {
	const phase = {
		job_id: 'publish-id',
		phase: 'cdn.sync',
		started_at: 1000,
		finished_at: 2000,
		message: null
	}
	const output = html({
		phases: [
			{ ...phase, status: 'failed', message: 'Earlier CDN attempt failed' },
			{
				...phase,
				status: 'completed',
				started_at: 2000,
				finished_at: 3000,
				message: 'Latest CDN attempt completed'
			}
		]
	})
	const details = disclosure(output, 'Details')
	expect(output).toContain('Published with errors')
	expect(text(details).match(/cdn\.sync/g)).toHaveLength(1)
	expect(text(details)).toContain('1 stages')
	expect(text(details)).toContain('Latest CDN attempt completed')
	expect(output).not.toContain('Earlier CDN attempt failed')
})

test('schemas and phase logs stay inside collapsed native Details', () => {
	const output = html({
		phases: [
			{
				job_id: 'publish-id',
				phase: 'cdn.sync',
				status: 'completed',
				started_at: 1000,
				finished_at: 2000,
				message: null
			}
		],
		schemas: { added: ['book.schema.json'], updated: [], pruned: [] },
		logs: [
			{
				job_id: 'publish-id',
				phase: 'cdn.sync',
				line_number: 1,
				ts: 1500,
				level: 'info',
				message: 'CDN assets synchronized'
			}
		]
	})
	const details = disclosure(output, 'Details')
	expect(details).toContain('book.schema.json')
	expect(text(output).match(/book\.schema\.json/g)).toHaveLength(1)
	expect(details).toContain('CDN assets synchronized')
	expect(text(output).match(/CDN assets synchronized/g)).toHaveLength(1)
})

test.each([
	{ kind: 'added', badge: 'New' },
	{ kind: 'updated', badge: 'Updated' },
	{ kind: 'pruned', badge: 'Removed' }
] as const)('schema $kind changes keep their $badge badge inside Details', ({ kind, badge }) => {
	const name = `${kind}.schema.json`
	const output = html({ schemas: { added: [], updated: [], pruned: [], [kind]: [name] } })
	const details = disclosure(output, 'Details')
	const rows = [...withoutComments(details).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)]
	const schemaRows = rows.filter((row) => text(row[1]).includes(name))
	expect(schemaRows).toHaveLength(1)
	expect(text(schemaRows[0][1]).trim().replace(/\s+/g, ' ')).toBe(`${badge} ${name}`)
})

test('local and remote checks are separate header actions without an Options menu or result checkboxes', () => {
	const output = html()
	expectHeaderChecksOnly(output)
	expect(text(output)).not.toContain('Options')
	expect(text(output)).not.toContain('Check again')
	expect(output).not.toMatch(/<input\b[^>]*\btype="checkbox"/)
})

test.each(['running', 'waiting'])(
	'both header checks stay disabled without a Publish CTA during a %s publish',
	(state) => {
		const output = html({ failedPieces: [], state })
		const actions = buttons(output)
		expectHeaderChecksOnly(output)
		for (const button of actions) {
			expect(button[1]).toMatch(/\bdisabled(?:\s|=|$)/)
		}
	}
)

test.each(['running', 'waiting'])(
	'a resumed %s audit retains a successful publication without a pending-ready state or Publish CTA',
	(state) => {
		const output = html({ failedPieces: [], audit: audit(state) })
		const content = text(output)
		expect(content.match(/Checking remaining changes…/g)).toHaveLength(1)
		expect(output.match(/role="status"/g)).toHaveLength(1)
		expect(output).not.toContain('role="alert"')
		expect(content).not.toContain('Published with errors')
		expect(content).not.toContain('Asset generation failed')
		expect(content).not.toContain('Up to date')
		expect(content).not.toContain('Select all')
		expectHeaderChecksOnly(output)
		for (const button of buttons(output)) {
			expect(button[1]).toMatch(/\bdisabled(?:\s|=|$)/)
		}
		expect(output).not.toMatch(/<input\b[^>]*\btype="checkbox"/)
		for (const file of ['healthy.book.md', 'failed.book.md']) {
			const row = pieceRow(output, file)
			expect(links(row).filter((link) => text(link[2]).trim() === 'Published')).toHaveLength(1)
			expect(row).toContain(`/admin/piece/${file}/published`)
			expectEditLink(row, file, `/admin/piece/${file}/source`)
			expect(text(row)).not.toMatch(/\b(?:New|Updated|Failed)\b/)
		}
	}
)

test.each(['running', 'waiting'])(
	'a resumed %s audit keeps partial publication links and inline errors while controls stay locked',
	(state) => {
		const output = html({ audit: audit(state) })
		const content = text(output)
		expect(content.match(/Checking remaining changes…/g)).toHaveLength(1)
		expect(output.match(/role="status"/g)).toHaveLength(1)
		expect(output).not.toContain('role="alert"')
		const healthy = pieceRow(output, 'healthy.book.md')
		const published = links(healthy).filter((link) => text(link[2]).trim() === 'Published')
		expect(published).toHaveLength(1)
		expect(published[0][1]).toContain('href="/admin/piece/healthy.book.md/published"')
		expectEditLink(healthy, 'healthy.book.md', '/admin/piece/healthy.book.md/source')
		const failed = pieceRow(output, 'failed.book.md')
		expect(text(failed)).toContain('Failed')
		expect(text(failed)).toContain('missing attachment')
		expect(content.match(/missing attachment/g)).toHaveLength(1)
		expect(failed).not.toContain('/admin/piece/failed.book.md/published')
		expectEditLink(failed, 'failed.book.md', '/admin/piece/failed.book.md/source')
		expectHeaderChecksOnly(output)
		for (const button of buttons(output)) {
			expect(button[1]).toMatch(/\bdisabled(?:\s|=|$)/)
		}
		// No pending diff is loaded during SSR, so retry selection is not observable here.
		expect(output).not.toMatch(/<input\b[^>]*\btype="checkbox"/)
	}
)

test.each(['partial', 'successful'])(
	'a resumed audit preserves the %s publication’s collapsed Details instead of audit progress',
	(result) => {
		const resumedAudit = audit('running')
		resumedAudit.phases = [
			{
				job_id: 'audit-id',
				phase: 'archive.diff',
				status: 'running',
				started_at: 3000,
				finished_at: null,
				message: 'Audit is comparing changes'
			}
		]
		resumedAudit.logs = [
			{
				job_id: 'audit-id',
				phase: 'archive.diff',
				line_number: 1,
				ts: 3500,
				level: 'info',
				message: 'Audit progress log'
			}
		]
		const output = html({
			failedPieces:
				result === 'partial' ? [{ filePath: 'failed.book.md', message: 'missing attachment' }] : [],
			phases: [
				{
					job_id: 'publish-id',
					phase: 'cdn.sync',
					status: 'completed',
					started_at: 1000,
					finished_at: 2000,
					message: 'Publication CDN sync completed'
				}
			],
			schemas: { added: ['book.schema.json'], updated: [], pruned: [] },
			logs: [
				{
					job_id: 'publish-id',
					phase: 'cdn.sync',
					line_number: 1,
					ts: 1500,
					level: 'info',
					message: 'Published assets synchronized'
				}
			],
			audit: resumedAudit
		})
		const details = disclosure(output, 'Details')
		expect(text(details)).toContain('1 stages')
		expect(text(details)).toContain('cdn.sync')
		expect(text(details)).toContain('Publication CDN sync completed')
		expect(text(details)).toContain('Published assets synchronized')
		expect(text(details)).toContain('book.schema.json')
		expect(text(output).match(/Published assets synchronized/g)).toHaveLength(1)
		expect(text(output)).not.toContain('archive.diff')
		expect(text(output)).not.toContain('Audit is comparing changes')
		expect(text(output)).not.toContain('Audit progress log')
	}
)

test.each(['running', 'waiting', 'failed', 'canceled'])(
	'a %s publication does not seed completed outcomes while an audit is available',
	(state) => {
		const output = html({ state, audit: audit('running') })
		expectHeaderChecksOnly(output)
		expect(output).not.toContain('aria-label="Pieces"')
		expect(output).not.toContain('/admin/piece/healthy.book.md/published')
		expect(output).not.toContain('missing attachment')
		expect(output).not.toMatch(/<input\b[^>]*\btype="checkbox"/)
		for (const button of buttons(output)) {
			expect(button[1]).toMatch(/\bdisabled(?:\s|=|$)/)
		}
	}
)

test('a cold visit with only successful publication history starts checking without known outcomes', () => {
	const output = html({ failedPieces: [] })
	expectChecking(output)
	expect(output).not.toContain('aria-label="Pieces"')
	expect(output).not.toContain('/admin/piece/healthy.book.md/published')
	expect(output).not.toContain('/admin/piece/failed.book.md/published')
})

test.each(['books/源 #?%.book.md', ''])(
	'contextual cold SSR cannot fall back to unchecked publishing: %s',
	(file) => {
		const previous = location.url
		location.url = `http://localhost/admin/publish?${new URLSearchParams({ check: '1', file })}`
		try {
			expectChecking(html({ failedPieces: [], publish: false }))
		} finally {
			location.url = previous
		}
	}
)

test('a cold visit without publish history renders checking and only the two header checks', () => {
	expectChecking(html({ failedPieces: [], publish: false }))
})

test.each(['running', 'waiting'])(
	'a resumed %s check disables both header checks without exposing a publish footer',
	(state) => {
		const output = html({ failedPieces: [], publish: false, audit: audit(state) })
		expectHeaderChecksOnly(output)
		for (const button of buttons(output)) {
			expect(button[1]).toMatch(/\bdisabled(?:\s|=|$)/)
		}
	}
)

test.each(['upserts', 'removals', 'schemas'] as const)(
	'a stored completed audit with %s is not a fresh check that authorizes publishing',
	(kind) => {
		const storedAudit = audit('completed', {
			pieces: {
				added: kind === 'upserts' ? ['new.book.md'] : [],
				updated: [],
				pruned: kind === 'removals' ? ['gone.book.md'] : []
			},
			schemas: { added: kind === 'schemas' ? ['book.schema.json'] : [], updated: [], pruned: [] }
		})
		expectChecking(html({ failedPieces: [], publish: false, audit: storedAudit }))
	}
)

test('a completed publish does not reuse its stored audit to offer another publish', () => {
	const output = html({
		failedPieces: [],
		audit: audit('completed', {
			pieces: { added: ['healthy.book.md'], updated: [], pruned: ['gone.book.md'] },
			schemas: { added: ['book.schema.json'], updated: [], pruned: [] }
		})
	})
	expectChecking(output)
	expect(output).not.toContain('aria-label="Pieces"')
	expect(output).not.toMatch(/<input\b[^>]*\btype="checkbox"/)
})

test('an unchanged contextual item has no force-rebuild or unchecked publish action', () => {
	const previous = location.url
	location.url = 'http://localhost/admin/publish?check=1&file=unchanged.book.md'
	try {
		const output = html({
			failedPieces: [],
			publish: false,
			audit: audit('completed', {
				pieces: { added: [], updated: [], pruned: [] },
				schemas: { added: [], updated: [], pruned: [] }
			})
		})
		expectChecking(output)
		expect(text(output)).not.toMatch(
			/force[\s-]*(?:publish|rebuild)|rebuild|publish (?:anyway|unchanged)/i
		)
	} finally {
		location.url = previous
	}
})

test('duplicate failures and overlapping diff entries render one escaped filename and inline error', () => {
	const file = 'books/<img src=x onerror=alert(1)> & "quote".book.md'
	const message = '<script>alert(1)</script> & missing attachment'
	const failure = { filePath: file, message }
	const output = html({
		failedPieces: [failure, failure],
		pieces: { added: [file, file], updated: [file], pruned: [] }
	})
	const row = pieceRow(output, file)
	expect(text(output).split(file)).toHaveLength(2)
	expect(text(output).split(message)).toHaveLength(2)
	expect(text(row)).toContain(message)
	expect(text(row)).toContain('Failed')
	expect(row).not.toContain('<script>')
	expect(row).not.toContain('<img')
	expect(row).toContain('&lt;script')
	expect(row).toContain('&lt;img')
	expect(links(row)).toHaveLength(1)
	expect(links(row)[0][1]).toContain('/source')
	expect(text(links(row)[0][2]).trim()).toBe('')
	expect(row).not.toContain('/published')
})
