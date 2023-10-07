import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { readdir, stat } from 'fs/promises'
import { Dirent, existsSync, mkdirSync, Stats } from 'fs'
import Pieces, { PieceArgv, PieceDirectories } from './pieces.js'
import path from 'path'
import yargs, { Argv } from 'yargs'
import { PieceCache } from './cache.js'
import { PieceDatabase } from './piece.js'
import { JTDSchemaType } from 'ajv/dist/core.js'
import { cpus, CpuInfo } from 'os'
import CacheForType from '../cache.js'

vi.mock('fs')
vi.mock('fs/promises')
vi.mock('../log')
vi.mock('./assets')
vi.mock('../cache')
vi.mock('os')

const mocks = {
	existsSync: vi.mocked(existsSync),
	mkdirSync: vi.mocked(mkdirSync),
	readdir: vi.mocked(readdir),
	cpus: vi.mocked(cpus),
	stat: vi.mocked(stat),
}

const spies: { [key: string]: SpyInstance } = {}

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
		const dir = 'somewhere'

		mocks.existsSync.mockReturnValueOnce(true)

		new Pieces(dir)

		expect(mocks.existsSync).toHaveBeenCalledWith(dir)
	})

	test('constructor makes root directory', () => {
		const dir = 'somewhere'

		mocks.existsSync.mockReturnValueOnce(false)

		new Pieces(dir)

		expect(mocks.existsSync).toHaveBeenCalledWith(dir)
		expect(mocks.mkdirSync).toHaveBeenCalledWith(dir, { recursive: true })
	})

	test('register', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>

		mocks.existsSync.mockReturnValue(true)

		const dirs = new Pieces(dir).register(piece, schema).directories(piece)

		expect(mocks.existsSync).toHaveBeenCalledTimes(4)
		expect(dirs).toEqual({
			root: expect.any(String),
			assets: expect.any(String),
			'assets.cache': expect.any(String),
		})
	})

	test('register makes directories', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>

		mocks.existsSync.mockReturnValue(false)

		const dirs = new Pieces(dir).register(piece, schema).directories(piece)

		expect(mocks.mkdirSync).toHaveBeenCalledTimes(4)
		expect(dirs).toEqual({
			root: expect.any(String),
			assets: expect.any(String),
			'assets.cache': expect.any(String),
		})
	})

	test('parseArgv', () => {
		const slug = '1984'
		const piece = 'books'
		const args = { path: slug, piece }

		const parsedArgs = Pieces.parseArgv(args)

		expect(parsedArgs).toEqual({ slug, piece })
	})

	test('parseArgv path', () => {
		const piece = 'books'
		const slug = '1984'
		const args = { path: `/somewhere/${piece}/${slug}.md` }

		mocks.existsSync.mockReturnValue(true)

		const parsedArgs = Pieces.parseArgv(args)

		expect(parsedArgs).toEqual({ slug, piece })
	})

	test('parseArgv path inside piece folder', () => {
		const piece = 'books'
		const slug = '1984'
		const args = { path: `${slug}.md` }

		mocks.existsSync.mockReturnValue(true)
		spies.resolve = vi.spyOn(path, 'resolve').mockReturnValue(`/somewhere/${piece}/${slug}.md`)

		const parsedArgs = Pieces.parseArgv(args)

		expect(parsedArgs).toEqual({ slug, piece })
	})

	test('parseArgv throws if file does not exist', () => {
		const slug = '1984'
		const args = { path: `${slug}.md` }

		mocks.existsSync.mockReturnValue(false)

		expect(() => Pieces.parseArgv(args)).toThrow()
	})

	test('parseArgv throws if piece option is required', () => {
		const slug = '1984'
		const args = { path: `${slug}` }

		mocks.existsSync.mockReturnValue(false)

		expect(() => Pieces.parseArgv(args)).toThrow()
	})

	test('parseArgv throws is piece is not valid', () => {
		const slug = '1984'
		const args = { path: `path/to/${slug}.jpg` }

		mocks.existsSync.mockReturnValue(false)

		expect(() => Pieces.parseArgv(args)).toThrow()
	})

	test('command', () => {
		const args = yargs() as Argv<PieceArgv>

		spies.option = vi.spyOn(args, 'option')
		spies.positional = vi.spyOn(args, 'positional')

		Pieces.command(args)

		expect(spies.option).toHaveBeenCalledWith('piece', expect.any(Object))
		expect(spies.positional).toHaveBeenCalledWith('path', expect.any(Object))
	})

	test('getAllSlugs', async () => {
		const dir = 'somewhere'
		const piece = 'books'
		const slugs = ['1984', '1q84']
		const files = slugs.map((slug) => `${dir}/${piece}/${slug}.md`)
		const dirent = files.map((file) => ({ isFile: () => true, name: file })) as Dirent[]
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>

		mocks.existsSync.mockReturnValue(true)
		mocks.readdir.mockResolvedValue(dirent)

		const allSlugs = await new Pieces(dir).register(piece, schema).getSlugs(piece)

		expect(allSlugs).toEqual(slugs)
	})

	test('getSlugsUpdated', async () => {
		const slugs: string[] = ['a', 'b', 'c']
		const fileUpdated = new Date('2201-11-11')
		const cacheUpdated = new Date('2101-11-11')
		const piece = 'books'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>
		const dir = 'somewhere'
		const pieces = new Pieces(dir).register(piece, schema)
		const cache = {
			get: async () => ({ lastProcessed: cacheUpdated }),
		} as unknown as CacheForType<PieceCache<PieceDatabase>>

		spies.getSlugs = vi.spyOn(pieces, 'getSlugs').mockResolvedValue(slugs)
		spies.caches = vi.spyOn(pieces, 'caches').mockReturnValue(cache)
		spies.getPath = vi.spyOn(pieces, 'getPath').mockReturnValue('somewhere/slug')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockResolvedValue({ mtime: fileUpdated } as Stats)

		const updatedSlugs = await pieces.getSlugsUpdated(piece, 'lastProcessed')

		expect(updatedSlugs).toEqual(slugs)
	})

	test('getSlugsUpdated filters untouched files', async () => {
		const slugs: string[] = ['a', 'b', 'c']
		const fileUpdated = new Date('2001-11-11')
		const cacheUpdated = new Date('2101-11-11')
		const piece = 'books'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>
		const dir = 'somewhere'
		const pieces = new Pieces(dir).register(piece, schema)
		const cache = {
			get: async () => ({ lastProcessed: cacheUpdated }),
		} as unknown as CacheForType<PieceCache<PieceDatabase>>

		spies.getSlugs = vi.spyOn(pieces, 'getSlugs').mockResolvedValue(slugs)
		spies.caches = vi.spyOn(pieces, 'caches').mockReturnValue(cache)
		spies.getPath = vi.spyOn(pieces, 'getPath').mockReturnValue('somewhere/slug')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockResolvedValue({ mtime: fileUpdated } as Stats)

		const updatedSlugs = await pieces.getSlugsUpdated(piece, 'lastProcessed')

		expect(updatedSlugs).toEqual([])
	})

	test('getSlugsUpdated filters in new files', async () => {
		const slugs: string[] = ['a', 'b', 'c']
		const fileUpdated = new Date('2001-11-11')
		const piece = 'books'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>
		const dir = 'somewhere'
		const pieces = new Pieces(dir).register(piece, schema)
		const cache = {
			get: async () => ({}),
		} as unknown as CacheForType<PieceCache<PieceDatabase>>

		spies.getSlugs = vi.spyOn(pieces, 'getSlugs').mockResolvedValue(slugs)
		spies.caches = vi.spyOn(pieces, 'caches').mockReturnValue(cache)
		spies.getPath = vi.spyOn(pieces, 'getPath').mockReturnValue('somewhere/slug')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockResolvedValue({ mtime: fileUpdated } as Stats)

		const updatedSlugs = await pieces.getSlugsUpdated(piece, 'lastProcessed')

		expect(updatedSlugs).toEqual(slugs)
	})

	test('getSlugsUpdated filters non-existant files', async () => {
		const slugs: string[] = ['a', 'b', 'c']
		const cacheUpdated = new Date('2101-11-11')
		const piece = 'books'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>
		const dir = 'somewhere'
		const pieces = new Pieces(dir).register(piece, schema)
		const cache = {
			get: async () => ({ lastProcessed: cacheUpdated }),
		} as unknown as CacheForType<PieceCache<PieceDatabase>>

		spies.getSlugs = vi.spyOn(pieces, 'getSlugs').mockResolvedValue(slugs)
		spies.caches = vi.spyOn(pieces, 'caches').mockReturnValue(cache)
		spies.getPath = vi.spyOn(pieces, 'getPath').mockReturnValue('somewhere/slug')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockRejectedValue(new Error('no file'))

		const updatedSlugs = await pieces.getSlugsUpdated(piece, 'lastProcessed')

		expect(updatedSlugs).toEqual([])
	})

	test('removeStaleCache', async () => {
		const oldSlugs: string[] = ['a', 'b', 'c']
		const slugs: string[] = []
		const piece = 'books'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>
		const dir = 'somewhere'
		const pieces = new Pieces(dir).register(piece, schema)
		const cache = {
			remove: vi.fn(async () => {
				await Promise.resolve()
			}),
			getAllFiles: async () => oldSlugs,
		} as unknown as CacheForType<PieceCache<PieceDatabase>>

		spies.getSlugs = vi.spyOn(pieces, 'getSlugs').mockResolvedValue(slugs)
		spies.caches = vi.spyOn(pieces, 'caches').mockReturnValue(cache)
		spies.getPath = vi.spyOn(pieces, 'getPath').mockReturnValue('somewhere/slug')
		mocks.cpus.mockReturnValue([{} as CpuInfo])

		const removed = await pieces.removeStaleCache(piece)

		expect(removed).toEqual(oldSlugs)
		expect(cache.remove).toHaveBeenCalledTimes(oldSlugs.length)
	})

	test('removeStaleCache skips on error', async () => {
		const oldSlugs: string[] = ['a', 'b', 'c']
		const slugs: string[] = []
		const piece = 'books'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>
		const dir = 'somewhere'
		const pieces = new Pieces(dir).register(piece, schema)
		const cache = {
			remove: vi.fn(async () => {
				throw new Error('no file')
			}),
			getAllFiles: async () => oldSlugs,
		} as unknown as CacheForType<PieceCache<PieceDatabase>>

		spies.getSlugs = vi.spyOn(pieces, 'getSlugs').mockResolvedValue(slugs)
		spies.caches = vi.spyOn(pieces, 'caches').mockReturnValue(cache)
		spies.getPath = vi.spyOn(pieces, 'getPath').mockReturnValue('somewhere/slug')
		mocks.cpus.mockReturnValue([{} as CpuInfo])

		const removed = await pieces.removeStaleCache(piece)

		expect(removed).toEqual([])
	})

	test('getPath', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const slug = 'slug'
		const root = 'root'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>
		const pieces = new Pieces(dir).register(piece, schema)
		const directories = { root } as PieceDirectories
		const filename = 'filename'

		spies.caches = vi.spyOn(pieces, 'directories').mockReturnValue(directories)
		spies.getFileName = vi.spyOn(pieces, 'getFileName').mockReturnValue(filename)

		const getPath = pieces.getPath(piece, slug)

		expect(getPath).toEqual(`${root}/${filename}`)
	})

	test('getFileName', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const slug = 'slug'
		const schema = {} as JTDSchemaType<PieceCache<PieceDatabase>>

		const filename = new Pieces(dir).register(piece, schema).getFileName(slug)

		expect(filename).toEqual(`${slug}.md`)
	})
})
