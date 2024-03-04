import { existsSync } from 'fs'
import { copyFile, stat, unlink, writeFile } from 'fs/promises'
import * as linkFixtures from './link.fixtures.js'
import log from '../../lib/log.js'
import { downloadToTmp } from '../../lib/web.js'
import { fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach, MockInstance } from 'vitest'
import { CpuInfo, cpus } from 'os'
import LinkPiece from './piece.js'
import { mockConfig } from '../../lib/config.mock.js'
import Piece from '../../lib/pieces/piece.js'
import { generateTags, generateSummary, generateClassification } from './openai.js'
import { LuzzleLinkType } from '@luzzle/kysely'
import { availability } from './wayback.js'
import { Config } from '../../lib/config.js'
import { mockDatabase } from '../../lib/database.mock.js'
import { makePieceMarkdownOrThrow } from '@luzzle/kysely'

vi.mock('file-type')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('../../lib/web')
vi.mock('./open-library')
vi.mock('./google-links')
vi.mock('./openai')
vi.mock('./wayback')
vi.mock('../../lib/md')
vi.mock('os')
vi.mock('../../lib/log')
vi.mock('../../lib/pieces/markdown.js')
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
	generateTags: vi.mocked(generateTags),
	generateSummary: vi.mocked(generateSummary),
	generateClassification: vi.mocked(generateClassification),
	availability: vi.mocked(availability),
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

	test('process', async () => {
		const slugs = ['slug']

		await new LinkPiece('root', db).process({} as Config, slugs)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
	})

	test('fetch', async () => {
		const configMock = mockConfig()
		const markdown = linkFixtures.makeLinkMarkdown()

		const linkPiece = new LinkPiece('root', db)

		spies.configGet = configMock.get.mockReturnValueOnce({})

		const fetched = await linkPiece.fetch(configMock, markdown)

		expect(fetched).toEqual(markdown)
	})

	test('fetch openai article', async () => {
		const configMock = mockConfig()
		const openAIKey = 'openAIKey'
		const markdown = linkFixtures.makeLinkMarkdown()
		const tags = ['tag1', 'tag2']
		const summary = 'summary'
		const classification = { is_article: true, is_paywall: false }
		const updatedMarkdown = {
			...markdown,
			frontmatter: {
				...markdown.frontmatter,
				keywords: tags.join(', '),
				summary: summary,
				type: LuzzleLinkType.Article,
				is_paywall: classification.is_paywall,
			},
		}
		const linkPiece = new LinkPiece('root', db)

		spies.configGet = configMock.get.mockReturnValueOnce({ openai: openAIKey })
		mocks.generateTags.mockResolvedValueOnce(tags)
		mocks.generateSummary.mockResolvedValueOnce(summary)
		mocks.generateClassification.mockResolvedValueOnce(classification)

		const fetched = await linkPiece.fetch(configMock, markdown, 'openai')

		expect(fetched).toEqual(updatedMarkdown)
	})

	test('fetch openai bookmark', async () => {
		const configMock = mockConfig()
		const openAIKey = 'openAIKey'
		const markdown = linkFixtures.makeLinkMarkdown()
		const tags = ['tag1', 'tag2']
		const summary = 'summary'
		const classification = { is_article: false, is_paywall: false }
		const updatedMarkdown = {
			...markdown,
			frontmatter: {
				...markdown.frontmatter,
				keywords: tags.join(', '),
				summary,
				type: LuzzleLinkType.Bookmark,
				is_paywall: classification.is_paywall,
			},
		}

		const linkPiece = new LinkPiece('root', db)

		spies.configGet = configMock.get.mockReturnValueOnce({ openai: openAIKey })
		mocks.generateTags.mockResolvedValueOnce(tags)
		mocks.generateSummary.mockResolvedValueOnce(summary)
		mocks.generateClassification.mockResolvedValueOnce(classification)
		const fetched = await linkPiece.fetch(configMock, markdown, 'openai')

		expect(fetched).toEqual(updatedMarkdown)
	})

	test('fetch openai without key', async () => {
		const configMock = mockConfig()
		const markdown = linkFixtures.makeLinkMarkdown()

		const linkPiece = new LinkPiece('root', db)

		spies.configGet = configMock.get.mockReturnValueOnce({})

		const fetched = await linkPiece.fetch(configMock, markdown, 'openai')

		expect(fetched).toEqual(markdown)
		expect(mocks.logWarn).toHaveBeenCalledOnce()
	})

	test('fetch wayback', async () => {
		const configMock = mockConfig()
		const markdown = linkFixtures.makeLinkMarkdown()
		const archiveUrl = 'archiveUrl'
		const updatedMarkdown = {
			...markdown,
			frontmatter: {
				...markdown.frontmatter,
				archive_url: archiveUrl,
			},
		}

		const linkPiece = new LinkPiece('root', db)

		spies.configGet = configMock.get.mockReturnValueOnce({})
		mocks.availability.mockResolvedValueOnce({
			archived_snapshots: {
				closest: { available: true, url: archiveUrl, timestamp: '', status: '' },
			},
			url: '',
		})

		const fetched = await linkPiece.fetch(configMock, markdown, 'wayback')

		expect(fetched).toEqual(updatedMarkdown)
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
