import { vi, describe, test, afterEach, expect, MockInstance } from 'vitest'
import yargs from 'yargs'
import { makeContext, makeMarkdownSample, makePieceMock } from '../utils/context.fixtures.js'
import { Piece } from '@luzzle/core'
import {
	makePieceOption,
	makePiecePathPositional,
	parsePieceOptionArgv,
	parsePiecePathPositionalArgv,
} from './pieces.js'

vi.mock('@luzzle/core')

const mocks = {
	Piece: vi.mocked(Piece),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/utils/pieces.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('makePieceOption', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		spies.positional = vi.spyOn(args, 'positional')

		makePieceOption(args)

		expect(spies.option).toHaveBeenCalledOnce()
	})

	test('makePiecePathPositional', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		spies.positional = vi.spyOn(args, 'positional')

		makePiecePathPositional(args)

		expect(spies.positional).toHaveBeenCalledOnce()
	})

	test('parsePieceOptionArgv', async () => {
		const name = 'books'
		const context = makeContext()
		const piece = makePieceMock()

		spies.getTypes = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce([name])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockResolvedValueOnce(piece)

		const result = await parsePieceOptionArgv(context, { piece: name })

		expect(result.piece).toBeInstanceOf(Piece)
	})

	test('parsePieceOptionArgv throws', async () => {
		const name = 'links'
		const context = makeContext()

		spies.getTypes = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])

		const parsing = parsePieceOptionArgv(context, { piece: name })

		await expect(parsing).rejects.toThrow()
	})

	test('parsePiecePathPositionalArgv', async () => {
		const name = 'books'
		const context = makeContext()
		const path = `./path/file.${name}.md`
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockResolvedValueOnce(piece)
		spies.parseFilename = vi
			.spyOn(context.pieces, 'parseFilename')
			.mockReturnValueOnce({ type: name, file: piece.type, format: 'md', slug: 'file' })
		spies.get = vi.spyOn(piece, 'get').mockResolvedValueOnce(markdown)

		const result = await parsePiecePathPositionalArgv(context, { piece: path })

		expect(result.markdown).toEqual(markdown)
		expect(result.piece).toEqual(piece)
		expect(result.file).toEqual(path)
	})

	test('parsePiecePathPositionalArgv no valid piece types', async () => {
		const name = 'books'
		const context = makeContext()
		const path = `./path/file.${name}.md`
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce([])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockResolvedValueOnce(piece)
		spies.get = vi.spyOn(piece, 'get').mockResolvedValueOnce(markdown)
		spies.parseFilename = vi
			.spyOn(context.pieces, 'parseFilename')
			.mockReturnValueOnce({ type: name, file: piece.type, format: 'md', slug: 'file' })

		const parsing = parsePiecePathPositionalArgv(context, { piece: path })

		await expect(parsing).rejects.toThrow()
	})

	test('parsePiecePathPositionalArgv invalid piece type', async () => {
		const name = 'books'
		const context = makeContext()
		const path = `./path/file.${name}-2.md`
		const piece = makePieceMock()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce([name])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockResolvedValueOnce(piece)
		spies.parseFilename = vi
			.spyOn(context.pieces, 'parseFilename')
			.mockReturnValueOnce({ type: 'books-2', file: path, format: 'md', slug: 'file' })

		const resulting = parsePiecePathPositionalArgv(context, { piece: path })

		await expect(resulting).rejects.toThrow()
	})
})
