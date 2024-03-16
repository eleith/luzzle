import { existsSync } from 'fs'
import { copyFile, stat, unlink, writeFile } from 'fs/promises'
import * as bookFixtures from './book.fixtures.js'
import log from '../../lib/log.js'
import { fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach, MockInstance } from 'vitest'
import { cpus } from 'os'
import BookPiece from './piece.js'
import { mockDatabase } from '../../lib/database.mock.js'
import { makePieceMarkdownOrThrow } from '@luzzle/kysely'

vi.mock('file-type')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('../../lib/web')
vi.mock('../../lib/md')
vi.mock('os')
vi.mock('../../lib/log')
vi.mock('@luzzle/kysely')

const mocks = {
	cpus: vi.mocked(cpus),
	copyFile: vi.mocked(copyFile),
	unlink: vi.mocked(unlink),
	stat: vi.mocked(stat),
	logError: vi.mocked(log.error),
	logWarn: vi.mocked(log.warn),
	logInfo: vi.mocked(log.info),
	fromFile: vi.mocked(fileTypeFromFile),
	writeFile: vi.mocked(writeFile),
	existSync: vi.mocked(existsSync),
	toMarkdown: vi.mocked(makePieceMarkdownOrThrow),
	fileTypeFromFile: vi.mocked(fileTypeFromFile),
}

const spies: Record<string, MockInstance> = {}
const { db } = mockDatabase()

describe('pieces/books/piece', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((name) => {
			spies[name].mockRestore()
			delete spies[name]
		})

		vi.useRealTimers()
	})

	test('constructor', () => {
		new BookPiece('root', db)
	})

	test('create', () => {
		const slug = 'slug'
		const title = 'title'
		const markdown = bookFixtures.makeBookMarkDown()

		mocks.toMarkdown.mockReturnValueOnce(markdown)

		const bookPiece = new BookPiece('root', db)

		bookPiece.create(slug, title)

		expect(mocks.toMarkdown).toHaveBeenCalledOnce()
	})
})
