import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import Pieces from './pieces.js'
import Piece from './piece.js'
import { Piece as PieceType, getPieceSchema, PieceFrontmatterJtdSchemas } from '@luzzle/core'
import { mockDatabase } from '../database.mock.js'

vi.mock('@luzzle/core')
vi.mock('./piece.js')

const mocks = {
	getPieceSchema: vi.mocked(getPieceSchema),
}

const directory = 'luzzle-pieces'
const { db } = mockDatabase()
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
		const pieces = new Pieces(directory, db)

		expect(pieces.directory).toEqual('luzzle-pieces')
	})

	test('getPiece', async () => {
		const pieces = new Pieces(directory, db)
		const schema = {} as PieceFrontmatterJtdSchemas['books']

		mocks.getPieceSchema.mockReturnValueOnce(schema)
		const piece = pieces.getPiece(PieceType.Book)

		expect(piece).toBeInstanceOf(Piece)
		expect(mocks.getPieceSchema).toHaveBeenCalledWith(PieceType.Book)
	})
})
