import log from './log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import CacheFor, { Cache } from './cache'
import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises'
import { Dirent, existsSync, mkdirSync } from 'fs'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd'
import { AnyValidateFunction } from 'ajv/dist/core'

vi.mock('./log')
vi.mock('../book')
vi.mock('fs/promises')
vi.mock('fs')
vi.mock('ajv/dist/jtd')

type TestCache = {
  id: string
  title?: string
  date: number
}

const testCacheSchema: JTDSchemaType<TestCache> = {
  properties: {
    id: { type: 'string' },
    date: { type: 'uint32' },
  },
  optionalProperties: {
    title: { type: 'string' },
  },
}

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logWarn: vi.spyOn(log, 'warn'),
  readFile: vi.mocked(readFile),
  writeFile: vi.mocked(writeFile),
  mkdir: vi.mocked(mkdir),
  readdir: vi.mocked(readdir),
  unlink: vi.mocked(unlink),
  existsSync: vi.mocked(existsSync),
  mkdirSync: vi.mocked(mkdirSync),
  compile: vi.spyOn(Ajv.prototype, 'compile'),
}

const spies: SpyInstance[] = []

describe('tools/lib/commands/attach', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    spies.forEach((spy) => {
      spy.mockRestore()
    })
  })

  test('get', async () => {
    const dir = 'somewhere'
    const slug = 'slug'
    const file = JSON.stringify({ id: 'id', date: 123 })

    mocks.readFile.mockResolvedValueOnce(file)
    mocks.compile.mockReturnValueOnce((() => true) as unknown as AnyValidateFunction)

    const cache = new CacheFor<TestCache>(testCacheSchema, dir)
    const cacheGet = await cache.get(slug)

    expect(mocks.compile).toBeCalledWith(
      expect.objectContaining({
        optionalProperties: expect.objectContaining({ database: testCacheSchema }),
      })
    )
    expect(mocks.readFile).toBeCalledWith(`${dir}/.cache/${slug}.json`, 'utf-8')
    expect(cacheGet).toEqual(JSON.parse(file))
  })

  test('get handles failed validation', async () => {
    const dir = 'somewhere'
    const slug = 'slug'
    const file = JSON.stringify({ id: 'id', date: 123 })

    mocks.readFile.mockResolvedValueOnce(file)
    mocks.compile.mockReturnValueOnce((() => false) as unknown as AnyValidateFunction)

    const cache = new CacheFor<TestCache>(testCacheSchema, dir)
    const cacheGet = await cache.get(slug)

    expect(mocks.compile).toBeCalledWith(
      expect.objectContaining({
        optionalProperties: expect.objectContaining({ database: testCacheSchema }),
      })
    )
    expect(mocks.readFile).toBeCalledWith(`${dir}/.cache/${slug}.json`, 'utf-8')
    expect(cacheGet).toEqual({})
  })

  test('get handles validation errors', async () => {
    const dir = 'somewhere'
    const slug = 'slug'

    mocks.readFile.mockRejectedValueOnce(new Error('error'))

    const cache = new CacheFor<TestCache>(testCacheSchema, dir)
    await cache.get(slug)

    expect(mocks.logInfo).toHaveBeenCalledOnce()
  })

  test('set', async () => {
    const dir = 'somewhere'
    const slug = 'slug'
    const cacheSet = { database: { id: 'id', date: 123 } } as Cache<TestCache>

    mocks.writeFile.mockResolvedValueOnce()
    mocks.mkdir.mockResolvedValueOnce('')

    const cache = new CacheFor<TestCache>(testCacheSchema, dir)
    await cache.set(slug, cacheSet)

    expect(mocks.writeFile).toHaveBeenCalledWith(
      `${dir}/.cache/${slug}.json`,
      JSON.stringify(cacheSet, null, 2)
    )
    expect(mkdir).toHaveBeenCalledWith(`${dir}/.cache`, { recursive: true })
  })

  test('update', async () => {
    const dir = 'somewhere'
    const slug = 'slug'
    const cacheUpdate = { database: { id: 'id', date: 123 } } as Cache<TestCache>

    mocks.writeFile.mockResolvedValueOnce()
    mocks.mkdir.mockResolvedValueOnce('')

    const cache = new CacheFor<TestCache>(testCacheSchema, dir)

    const spyGetCache = vi.spyOn(cache, 'get')
    spyGetCache.mockResolvedValueOnce({
      database: { id: 'id2', date: 13 },
    } as Cache<TestCache>)

    await cache.update(slug, cacheUpdate)

    expect(mocks.writeFile).toHaveBeenCalledWith(
      `${dir}/.cache/${slug}.json`,
      JSON.stringify(cacheUpdate, null, 2)
    )
    expect(spyGetCache).toHaveBeenCalledWith(slug)
    expect(mkdir).toHaveBeenCalledWith(`${dir}/.cache`, { recursive: true })
  })

  test('getAllFiles', async () => {
    const dir = 'somewhere'
    const allFiles = ['a', 'b'] as unknown as Dirent[]

    mocks.readdir.mockResolvedValueOnce(allFiles)

    const cache = new CacheFor<TestCache>(testCacheSchema, dir)
    const files = await cache.getAllFiles()

    expect(mocks.readdir).toHaveBeenCalledWith(`${dir}/.cache`)
    expect(files).toEqual(allFiles)
  })

  test('remove', async () => {
    const dir = 'somewhere'
    const slug = 'slug'

    mocks.existsSync.mockReturnValueOnce(true)
    mocks.unlink.mockResolvedValueOnce()

    const cache = new CacheFor<TestCache>(testCacheSchema, dir)
    await cache.remove(slug)

    expect(mocks.unlink).toHaveBeenCalledWith(`${dir}/.cache/${slug}.json`)
    expect(mocks.existsSync).toHaveBeenCalledWith(`${dir}/.cache/${slug}.json`)
  })

  test('remove skips missing file', async () => {
    const dir = 'somewhere'
    const slug = 'slug'

    mocks.existsSync.mockReturnValueOnce(false)
    mocks.unlink.mockResolvedValueOnce()

    const cache = new CacheFor<TestCache>(testCacheSchema, dir)
    await cache.remove(slug)

    expect(mocks.existsSync).toHaveBeenCalledWith(`${dir}/.cache/${slug}.json`)
    expect(mocks.unlink).not.toHaveBeenCalled()
  })
})
