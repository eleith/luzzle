import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import Pieces from './pieces.js'
import Piece from './piece.js'
import { fdir } from 'fdir'

vi.mock('./piece.js')
vi.mock('fdir', () => {
	const fdir = vi.fn()
	fdir.prototype = {
		withRelativePaths: vi.fn().mockReturnThis(),
		withDirs: vi.fn().mockReturnThis(),
		crawl: vi.fn().mockImplementation(() => ({
			sync: vi.fn().mockReturnValue([]),
		})),
	}
	return { fdir }
})

const mocks = {
	test: vi.fn(),
}
const directory = 'luzzle-pieces'
const spies: { [key: string]: MockInstance } = {}

describe('lib/pieces/pieces.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('constructor', () => {
		const pieces = new Pieces(directory)

		expect(pieces.directory).toEqual('luzzle-pieces')
	})

	test('getPiece', async () => {
		const pieces = new Pieces(directory)
		const piece = pieces.getPiece('books')

		expect(piece).toBeInstanceOf(Piece)
	})

	test('getTypeFromFile', () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const file = `/path/to/slug.${type}.md`

		const result = pieces.getTypeFromFile(file)

		expect(result).toEqual(type)
	})

	test('getTypeFromFile returns null', () => {
		const pieces = new Pieces(directory)
		const file = `/path/to/slug.md`

		const result = pieces.getTypeFromFile(file)

		expect(result).toEqual('path/to')
	})

	test('getTypes', async () => {
		const type = 'books'
		const pieces = new Pieces(directory)

		spies.crawl = vi.spyOn(fdir.prototype, 'crawl').mockReturnValue({
			sync: () => [`/path/to/${type}.json`],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any)

		const types = await pieces.getTypes()

		expect(types).toEqual([type])
	})

	test('getFiles', async () => {
		const pieces = new Pieces(directory)
		const onDisk = ['/path/to/hi.books.md', '/path/to/bye.books.md']

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce(['books'])
		spies.crawl = vi.spyOn(fdir.prototype, 'crawl').mockReturnValueOnce({
			sync: () => onDisk,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any)

		const items = await pieces.getFiles()

		expect(items).toEqual(onDisk)
	})
})
