import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { readdir, stat } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import Pieces from './pieces.js'
import path from 'path'
import yargs, { Argv } from 'yargs'
import { makePiece } from './piece.fixtures.js'
import { makePieceCommand, parsePieceArgv, PieceArgv } from './utils.js'
import Piece, { InterfacePiece } from './piece.js'
import {
	Piece as PieceType,
	PieceFrontmatter,
	Pieces as PieceTypes,
	PieceSelectable,
} from '@luzzle/kysely'
import { mockDatabase } from '../database.mock.js'

vi.mock('../../pieces/books/index', () => makePiece())
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('../log')
vi.mock('./assets')
vi.mock('../cache')
vi.mock('os')
vi.mock('ajv/dist/jtd')

const mocks = {
	existsSync: vi.mocked(existsSync),
	mkdirSync: vi.mocked(mkdirSync),
	readdir: vi.mocked(readdir),
	stat: vi.mocked(stat),
}

const directory = 'luzzle-pieces'
const { db } = mockDatabase()
const spies: { [key: string]: MockInstance } = {}

describe('lib/pieces/pieces', () => {
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

	test('register', () => {
		mocks.existsSync.mockReturnValueOnce(false)
		mocks.existsSync.mockReturnValue(true)

		const pieces = new Pieces(directory, db)
		pieces.register(
			makePiece() as unknown as InterfacePiece<PieceTypes, PieceSelectable, PieceFrontmatter>
		)

		expect(mocks.mkdirSync).toHaveBeenCalledWith(pieces.directory, { recursive: true })
		expect(mocks.existsSync).toHaveBeenCalledTimes(3)
	})

	test('register makes directories', () => {
		mocks.existsSync.mockReturnValue(false)

		const pieces = new Pieces(directory, db)
		pieces.register(
			makePiece() as unknown as InterfacePiece<PieceTypes, PieceSelectable, PieceFrontmatter>
		)
		expect(mocks.mkdirSync).toHaveBeenCalledTimes(3)
	})

	test('parseArgv', () => {
		const slug = '1984'
		const piece = 'books'
		const args = { path: slug, piece }

		const parsedArgs = parsePieceArgv(args)

		expect(parsedArgs).toEqual({ slug, piece })
	})

	test('parseArgv path', () => {
		const piece = 'books'
		const slug = '1984'
		const args = { path: `/somewhere/${piece}/${slug}.md` }

		mocks.existsSync.mockReturnValue(true)

		const parsedArgs = parsePieceArgv(args)

		expect(parsedArgs).toEqual({ slug, piece })
	})

	test('parseArgv path inside piece folder', () => {
		const piece = 'books'
		const slug = '1984'
		const args = { path: `${slug}.md` }

		mocks.existsSync.mockReturnValue(true)
		spies.resolve = vi.spyOn(path, 'resolve').mockReturnValue(`/somewhere/${piece}/${slug}.md`)

		const parsedArgs = parsePieceArgv(args)

		expect(parsedArgs).toEqual({ slug, piece })
	})

	test('parseArgv throws if file does not exist', () => {
		const slug = '1984'
		const args = { path: `${slug}.md` }

		mocks.existsSync.mockReturnValue(false)

		expect(() => parsePieceArgv(args)).toThrow()
	})

	test('parseArgv throws if piece option is required', () => {
		const slug = '1984'
		const args = { path: `${slug}` }

		mocks.existsSync.mockReturnValue(false)

		expect(() => parsePieceArgv(args)).toThrow()
	})

	test('parseArgv throws is piece is not valid', () => {
		const slug = '1984'
		const args = { path: `path/to/${slug}.jpg` }

		mocks.existsSync.mockReturnValue(false)

		expect(() => parsePieceArgv(args)).toThrow()
	})

	test('command', () => {
		const args = yargs() as Argv<PieceArgv>

		spies.option = vi.spyOn(args, 'option')
		spies.positional = vi.spyOn(args, 'positional')

		makePieceCommand(args)

		expect(spies.option).toHaveBeenCalledWith('piece', expect.any(Object))
		expect(spies.positional).toHaveBeenCalledWith('path', expect.any(Object))
	})

	test('getPiece', async () => {
		const pieces = new Pieces(directory, db)
		spies.register = vi
			.spyOn(pieces, 'register')
			.mockReturnValueOnce(Piece as unknown as InstanceType<typeof Piece>)

		const piece = await pieces.getPiece(PieceType.Book)

		expect(piece).toEqual(Piece)
		expect(spies.register).toHaveBeenCalled()
	})

	test('getPiece throws', async () => {
		const pieces = new Pieces(directory, db)
		expect(() => pieces.getPiece('fake' as unknown as PieceTypes)).rejects.toThrow()
	})
})
