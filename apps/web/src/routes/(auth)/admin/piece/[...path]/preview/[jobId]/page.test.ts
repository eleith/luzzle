import { expect, test, vi } from 'vitest'
import { createRawSnippet, type ComponentProps } from 'svelte'
import { render } from 'svelte/server'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import { makePublicConfig } from '#lib/server/config.fixture.js'
import { publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import Overview from './+page.svelte'
import PreviewLayout from './+layout.svelte'

vi.mock('$app/state', () => ({
	page: {
		url: new URL('https://app.test/admin/piece/books/book.md/preview/current-job'),
		route: { id: '/(auth)/admin/piece/[...path]/preview/[jobId]' }
	}
}))
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: { path: string; jobId?: string }) =>
		route
			.replace('/(auth)', '')
			.replace('[...path]', () => params.path)
			.replace('[jobId]', () => params.jobId ?? '')
}))

type Data = ComponentProps<typeof Overview>['data']

const job = {
	pieceTypes: ['books'],
	config: makePublicConfig({
		url: {
			app: 'https://public.test/site',
			app_assets: '/static',
			luzzle_assets: 'https://cdn.test/published'
		}
	}),
	meta: { title: 'Garden', description: 'Description' },
	preview: true as const,
	file: 'books/book.md',
	job: 'current-job',
	createdAt: '2026-11-01T12:00:00.000Z',
	finishedAt: null,
	phases: [
		{
			job_id: 'current-job',
			phase: 'transform',
			status: 'completed',
			started_at: Date.UTC(2026, 10, 1, 12),
			finished_at: Date.UTC(2026, 10, 1, 12, 0, 1),
			message: null
		}
	],
	logs: [
		{
			job_id: 'current-job',
			phase: 'transform',
			line_number: 1,
			ts: Date.UTC(2026, 10, 1, 12),
			level: 'info',
			message: 'Preview seed line'
		}
	]
}
const generatedCover: PublicWebPieceAsset = {
	asset_key: 'cover',
	transformation: 'image.original',
	asset_path: 'generated/cover.jpg',
	mime_type: 'image/jpeg'
}
const archiveAttachment: PublicWebPieceAsset = {
	asset_key: 'manual',
	transformation: 'attachment',
	asset_path: 'archive/manual.pdf',
	mime_type: 'application/pdf'
}
const completedPreview = {
	...job,
	status: 'completed',
	finishedAt: '2026-11-01T12:00:02.000Z',
	outputs: [generatedCover],
	piece: {
		...publishedPiece,
		title: 'Preview <Draft>',
		templates: {
			icon: { name: 'default', fields: { image: 'cover' } },
			page: { name: 'default', fields: { image: 'cover' } },
			opengraph: { name: 'default', fields: { image: 'cover' } }
		},
		assets: [generatedCover, archiveAttachment]
	},
	tags: []
} satisfies Data

function renderPreview(data: Data) {
	const params = { path: data.file, jobId: data.job }
	const children = createRawSnippet(() => ({
		render: () => render(Overview, { props: { data, params } }).body
	}))
	return render(PreviewLayout, { props: { data, params, children } }).body
}

test.each(['running', 'completed'] as const)(
	'%s Preview deduplicates replayed seed logs while retaining distinct lines',
	(status) => {
		const replayed = { ...job.logs[0], message: 'Replayed seed line' }
		const logs = [replayed, { ...replayed }, { ...replayed, line_number: 2, message: 'Later line' }]
		let data: Data = { ...job, status: 'running', logs }
		if (status === 'completed') data = { ...completedPreview, logs }

		const html = renderPreview(data)

		expect(html.match(/Replayed seed line/g)).toHaveLength(1)
		expect(html.match(/Later line/g)).toHaveLength(1)
	}
)

test('completed Preview inspects only generated outputs in the current job namespace', () => {
	const html = renderPreview(completedPreview)

	expect(html).toContain('Preview &lt;Draft>')
	expect(html).toContain('Preview logs')
	expect(html).toContain('Preview seed line')
	expect(html).toContain('href="/admin/preview/current-job/asset/generated/cover.jpg"')
	expect(html).not.toContain('archive/manual.pdf')
	expect(html).not.toContain('/pieces/assets/')
	expect(html.indexOf('Preview logs')).toBeLessThan(html.indexOf('Preview assets'))
	expect(html.match(/<main\b/g)).toHaveLength(1)
})

test('empty generated outputs do not fall back to SDK passthrough assets', () => {
	const html = renderPreview({ ...completedPreview, outputs: [] })

	expect(html).toContain('Preview assets')
	expect(html).toContain('None recorded')
	expect(html).not.toContain('generated/cover.jpg')
	expect(html).not.toContain('archive/manual.pdf')
})

test('a completed job without an assembled result keeps its facts and logs rather than crashing', () => {
	const html = renderPreview({ ...job, status: 'completed' })

	expect(html).toContain('Preview seed line')
	expect(html).toContain('Preview logs')
	expect(html).toContain('Completed')
	expect(html).not.toContain('Preview assets')
	expect(html.match(/<main\b/g)).toHaveLength(1)
})
