import { expect, test, vi } from 'vitest'
import { load } from './+page.server.js'

const { getFilesIn, parseFilename } = vi.hoisted(() => ({
	getFilesIn: vi.fn(async () => ({
		directories: ['child/'],
		pieces: ['one.book.md'],
		assets: ['cover.jpg']
	})),
	parseFilename: vi.fn((file: string) => ({ file }))
}))
vi.mock('$lib/server/pieces', () => ({ getPieces: () => ({ getFilesIn, parseFilename }) }))

test('directory loader keeps browsing data without the unused mode marker', async () => {
	const event = { params: { directory: 'books' } } as Parameters<typeof load>[0]
	expect(await load(event)).toEqual({
		files: {
			directories: [{ path: 'books/child/', name: 'child' }],
			pieces: [{ file: 'books/one.book.md' }],
			assets: [{ path: 'books/cover.jpg', name: 'cover.jpg' }]
		},
		directory: { parent: '.', current: 'books' }
	})
	expect(getFilesIn).toHaveBeenCalledWith('books')
	expect(parseFilename).toHaveBeenCalledWith('books/one.book.md')
})
