import { existsSync } from 'fs'
import { copyFile, stat, unlink, writeFile } from 'fs/promises'
import * as linkFixtures from './link.fixtures.js'
import log from '../../lib/log.js'
import { addFrontMatter, extract } from '../../lib/md.js'
import { downloadToTmp } from '../../lib/web.js'
import { fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach, SpyInstance } from 'vitest'
import { CpuInfo, cpus } from 'os'
import LinkPiece from './piece.js'
import { toValidatedMarkDown } from '../../lib/pieces/markdown.js'
import { mockConfig } from '../../lib/config.mock.js'
import Piece from '../../lib/pieces/piece.js'

vi.mock('file-type')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('../../lib/web')
vi.mock('./open-library')
vi.mock('./google-links')
vi.mock('./openai')
vi.mock('../../lib/md')
vi.mock('os')
vi.mock('../../lib/log')
vi.mock('../../lib/pieces/markdown.js')
vi.mock('@luzzle/kysely')

const mocks = {
	cpus: vi.mocked(cpus),
	addFrontMatter: vi.mocked(addFrontMatter),
	extract: vi.mocked(extract),
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
	toMarkDown: vi.mocked(toValidatedMarkDown),
}

const spies: Record<string, SpyInstance> = {}

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
		new LinkPiece('root')
	})

	test('toCreateInput', async () => {
		const linkMarkdown = linkFixtures.makeLinkMarkdown()

		const linkPiece = new LinkPiece('root')
		const input = await linkPiece.toCreateInput(linkMarkdown)

		expect(input).toEqual(expect.objectContaining({ id: expect.any(String) }))
	})

	test('toUpdateInput', async () => {
		const link = linkFixtures.makeLink({ active: false })
		const linkMarkdown = linkFixtures.makeLinkMarkdown({ frontmatter: { active: true } })

		const linkPiece = new LinkPiece('root')
		const update = await linkPiece.toUpdateInput(linkMarkdown, link)

		expect(update).toEqual(
			expect.objectContaining({ date_updated: expect.any(Number), active: true })
		)
	})

	test('toUpdateInput only updates timestamp', async () => {
		const link = linkFixtures.makeLink()
		const linkMarkdown = linkFixtures.makeLinkMarkdown()

		const linkPiece = new LinkPiece('root')
		const update = await linkPiece.toUpdateInput(linkMarkdown, link)

		expect(update).toEqual(expect.objectContaining({ date_updated: expect.any(Number) }))
	})

	test('processCleanUp with no cache', async () => {
		const slugs = ['slug1']

		mocks.unlink.mockResolvedValue()
		mocks.existSync.mockReturnValue(false)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.PieceCleanUpCache.mockResolvedValueOnce(slugs)

		await new LinkPiece('root').cleanUpCache(slugs)

		expect(mocks.unlink).toHaveBeenCalledTimes(0)
	})

	test('process', async () => {
		const slugs = ['slug']

		await new LinkPiece('root').process(slugs)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
	})

	test('fetch', async () => {
		const configMock = mockConfig()
		const markdown = linkFixtures.makeLinkMarkdown()

		const fetched = await new LinkPiece('root').fetch(configMock, markdown)

		expect(fetched).toEqual(markdown)
	})

	test('create', () => {
		const slug = 'slug'
		const title = 'title'
		const markdown = linkFixtures.makeLinkMarkdown()

		mocks.toMarkDown.mockReturnValueOnce(markdown)

		new LinkPiece('root').create(slug, title)

		expect(mocks.toMarkDown).toHaveBeenCalledOnce()
	})
})
