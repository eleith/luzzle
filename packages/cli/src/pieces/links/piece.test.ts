import { existsSync } from 'fs'
import { copyFile, stat, unlink, writeFile } from 'fs/promises'
import * as linkFixtures from './link.fixtures.js'
import log from '../../lib/log.js'
import { downloadToTmp } from '../../lib/web.js'
import { fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach, MockInstance } from 'vitest'
import { CpuInfo, cpus } from 'os'
import LinkPiece from './piece.js'
import Piece from '../../lib/pieces/piece.js'
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
	downloadTo: vi.mocked(downloadToTmp),
	logError: vi.mocked(log.error),
	logWarn: vi.mocked(log.warn),
	logInfo: vi.mocked(log.info),
	fromFile: vi.mocked(fileTypeFromFile),
	writeFile: vi.mocked(writeFile),
	existSync: vi.mocked(existsSync),
	LinkPieceGetFileName: vi.spyOn(LinkPiece.prototype, 'getFileName'),
	PieceCleanUpCache: vi.spyOn(Piece.prototype, 'cleanUpCache'),
	toMarkdown: vi.mocked(makePieceMarkdownOrThrow),
}

const spies: Record<string, MockInstance> = {}
const { db } = mockDatabase()

describe('pieces/links/piece', () => {
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
		new LinkPiece('root', db)
	})

	test('processCleanUp with no cache', async () => {
		const slugs = ['slug1']

		mocks.unlink.mockResolvedValue()
		mocks.existSync.mockReturnValue(false)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.PieceCleanUpCache.mockResolvedValueOnce(slugs)

		await new LinkPiece('root', db).cleanUpCache(slugs)

		expect(mocks.unlink).toHaveBeenCalledTimes(0)
	})

	test('create', () => {
		const slug = 'slug'
		const title = 'title'
		const markdown = linkFixtures.makeLinkMarkdown()

		mocks.toMarkdown.mockReturnValueOnce(markdown)

		new LinkPiece('root', db).create(slug, title)

		expect(mocks.toMarkdown).toHaveBeenCalledOnce()
	})
})
