import { beforeEach, expect, test, vi } from 'vitest'
import { assetPathToUrl } from '@luzzle/web.pieces'
import { publishedPiece } from '../viewer/fixtures/published.js'
import { getPieceHelpers } from './page-state.js'

const { page } = vi.hoisted(() => ({
	page: {
		params: {} as { jobId?: string },
		url: new URL('https://app.example/pieces/books/book'),
		data: {
			preview: undefined as boolean | undefined,
			job: undefined as string | undefined,
			config: { url: { app: 'https://app.example', luzzle_assets: '' } }
		}
	}
}))
vi.mock('$app/state', () => ({ page }))

beforeEach(() => {
	page.url = new URL('https://app.example/pieces/books/book')
	page.params = {}
	page.data.preview = undefined
	page.data.job = undefined
	page.data.config.url = { app: 'https://app.example', luzzle_assets: '' }
})

test('Preview uses its declared job, not the current route parameter', () => {
	page.params.jobId = 'unrelated-route-job'
	page.data.preview = true
	page.data.job = 'selected job'
	expect(getPieceHelpers(publishedPiece).getPieceAssetUrl('cover', 'image.original')).toBe(
		'/admin/preview/selected%20job/asset/published/cover.jpg'
	)
})

test.each([undefined, ''])('Preview requires a nonempty job, received %j', (job) => {
	page.data.preview = true
	page.data.job = job
	expect(() => getPieceHelpers(publishedPiece)).toThrow('Preview rendering requires a job.')
})

test('a preview route and job do not select private assets without a preview flag', () => {
	page.url = new URL('https://app.example/admin/view/preview/route-job')
	page.params.jobId = 'route-job'
	page.data.job = 'route-job'
	page.data.config.url.luzzle_assets = 'https://cdn.example'
	expect(getPieceHelpers(publishedPiece).getPieceAssetUrl('cover', 'image.original')).toBe(
		assetPathToUrl('published/cover.jpg', 'https://cdn.example')
	)
})
