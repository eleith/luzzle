import { existsSync } from 'fs'
import { copyFile, stat, unlink, writeFile } from 'fs/promises'
import sharp from 'sharp'
import * as linkFixtures from './link.fixtures.js'
import log from '../../lib/log.js'
import { addFrontMatter, extract } from '../../lib/md.js'
import { downloadToTmp } from '../../lib/web.js'
import { fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach, SpyInstance } from 'vitest'
import { CpuInfo, cpus } from 'os'
import LinkPiece from './piece.js'
import { Piece, PieceDirectories, toValidatedMarkDown } from '../../lib/pieces/index.js'
import { mockConfig } from '../../lib/config.mock.js'

vi.mock('file-type')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('sharp')
vi.mock('../../lib/web')
vi.mock('./open-library')
vi.mock('./google-links')
vi.mock('./openai')
vi.mock('../../lib/md')
vi.mock('os')
vi.mock('../../lib/log')
vi.mock('../../lib/pieces/index')

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
	sharp: vi.mocked(sharp),
	fromFile: vi.mocked(fileTypeFromFile),
	writeFile: vi.mocked(writeFile),
	existSync: vi.mocked(existsSync),
	LinkPieceDirectories: vi.spyOn(LinkPiece.prototype, 'directories', 'get'),
	LinkPieceGetFileName: vi.spyOn(LinkPiece.prototype, 'getFileName'),
	LinkPieceCache: vi.spyOn(LinkPiece.prototype, 'cache', 'get'),
	PieceCleanUpCache: vi.spyOn(Piece.prototype, 'cleanUpCache'),
	toMarkDown: vi.mocked(toValidatedMarkDown),
}

const spies: Record<string, SpyInstance> = {}

describe('lib/links/piece', () => {
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
		const linkMarkdown = linkFixtures.makeLinkMarkDown()

		const linkPiece = new LinkPiece('root')
		const input = await linkPiece.toCreateInput(linkMarkdown)

		expect(input).toEqual(expect.objectContaining({ id: expect.any(String) }))
	})

	test('toUpdateInput', async () => {
		const link = linkFixtures.makeLink({ active: false })
		const linkMarkdown = linkFixtures.makeLinkMarkDown({ frontmatter: { active: true } })

		const linkPiece = new LinkPiece('root')
		const update = await linkPiece.toUpdateInput(linkMarkdown, link)

		expect(update).toEqual(
			expect.objectContaining({ date_updated: expect.any(Number), active: true })
		)
	})

	test('toUpdateInput only updates timestamp', async () => {
		const link = linkFixtures.makeLink()
		const linkMarkdown = linkFixtures.makeLinkMarkDown()

		const linkPiece = new LinkPiece('root')
		const update = await linkPiece.toUpdateInput(linkMarkdown, link)

		expect(update).toEqual(expect.objectContaining({ date_updated: expect.any(Number) }))
	})

	test('processCleanUp with no cache', async () => {
		const slugs = ['slug1']
		const assetDir = 'assets'

		mocks.unlink.mockResolvedValue()
		mocks.existSync.mockReturnValue(false)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.LinkPieceDirectories.mockReturnValue({
			assets: assetDir,
			'assets.cache': assetDir,
		} as PieceDirectories)
		mocks.PieceCleanUpCache.mockResolvedValueOnce(slugs)

		await new LinkPiece('root').cleanUpCache(slugs)

		expect(mocks.unlink).toHaveBeenCalledTimes(0)
	})

	test('attach', async () => {
		const markdown = linkFixtures.makeLinkMarkDown()

		const linkPiece = new LinkPiece('root')

		await linkPiece.attach('file', markdown)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
	})

	test('process', async () => {
		const slugs = ['slug']

		await new LinkPiece('root').process(slugs)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
	})

	test('fetch', async () => {
		const configMock = mockConfig()
		const markdown = linkFixtures.makeLinkMarkDown()

		const fetched = await new LinkPiece('root').fetch(configMock, markdown)

		expect(fetched).toEqual(markdown)
	})

	test('create', () => {
		const slug = 'slug'
		const title = 'title'
		const markdown = linkFixtures.makeLinkMarkDown()

		mocks.toMarkDown.mockReturnValueOnce(markdown)

		new LinkPiece('root').create(slug, title)

		expect(mocks.toMarkDown).toHaveBeenCalledOnce()
	})
})
