import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import Pieces from './pieces.js'
import Piece from './piece.js'
import { readdir } from 'fs/promises'
import { Dirent } from 'fs'

vi.mock('@luzzle/core')
vi.mock('./piece.js')
vi.mock('fs/promises')

const mocks = {
	readdir: vi.mocked(readdir),
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
		const piece = await pieces.getPiece('books')

		expect(piece).toBeInstanceOf(Piece)
	})

	test('findPieceNames', async () => {
		const pieces = new Pieces(directory)
		const dirs = [
			{ isDirectory: () => true, name: 'one' },
			{ isDirectory: () => false, name: 'two' },
			{ isDirectory: () => true, name: '.three' },
		] as Dirent[]

		mocks.readdir.mockResolvedValueOnce(dirs)

		const pieceNames = await pieces.findPieceNames()

		expect(pieceNames).toEqual(['one'])
	})
})
